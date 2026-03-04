import argparse
import ast
import dataclasses
import datetime as _dt
import fnmatch
import hashlib
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, Iterable, Optional


HTTP_DECORATOR_METHODS = {
    "get",
    "post",
    "put",
    "delete",
    "patch",
    "options",
    "head",
}


DEFAULT_EXCLUDES = [
    ".git",
    ".idea",
    ".vscode",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    "node_modules",
    "dist",
    "build",
    ".turbo",
    ".next",
    ".code_index",
]


CONFIG_FILE_NAMES = {
    "docker-compose.yml",
    "docker-compose.prod.yml",
    "Dockerfile",
    ".dockerignore",
    ".env.example",
    "requirements.txt",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "vite.config.ts",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "eslint.config.js",
    "tailwind.config.js",
    "postcss.config.js",
    "nginx.conf",
    "nginx-initial.conf",
}


TS_SYMBOL_PATTERNS: list[tuple[str, str]] = [
    ("function", r"^\s*export\s+function\s+(?P<name>[A-Za-z_\$][\w\$]*)\s*\("),
    ("function", r"^\s*function\s+(?P<name>[A-Za-z_\$][\w\$]*)\s*\("),
    ("function", r"^\s*export\s+async\s+function\s+(?P<name>[A-Za-z_\$][\w\$]*)\s*\("),
    ("function", r"^\s*async\s+function\s+(?P<name>[A-Za-z_\$][\w\$]*)\s*\("),
    ("variable", r"^\s*export\s+(?:const|let|var)\s+(?P<name>[A-Za-z_\$][\w\$]*)\b"),
    ("variable", r"^\s*(?:const|let|var)\s+(?P<name>[A-Za-z_\$][\w\$]*)\b"),
    ("class", r"^\s*export\s+class\s+(?P<name>[A-Za-z_\$][\w\$]*)\b"),
    ("class", r"^\s*class\s+(?P<name>[A-Za-z_\$][\w\$]*)\b"),
    ("interface", r"^\s*export\s+interface\s+(?P<name>[A-Za-z_\$][\w\$]*)\b"),
    ("interface", r"^\s*interface\s+(?P<name>[A-Za-z_\$][\w\$]*)\b"),
    ("type", r"^\s*export\s+type\s+(?P<name>[A-Za-z_\$][\w\$]*)\b"),
    ("type", r"^\s*type\s+(?P<name>[A-Za-z_\$][\w\$]*)\b"),
]


IMPORT_LINE_START_RE = re.compile(r"^\s*(import|export)\b")
IMPORT_FROM_RE = re.compile(r"""\bfrom\s+['"](?P<spec>[^'"]+)['"]""")
IMPORT_BARE_RE = re.compile(r"""^\s*import\s+['"](?P<spec>[^'"]+)['"]\s*;?\s*$""")
REQUIRE_RE = re.compile(r"""require\(\s*['"](?P<spec>[^'"]+)['"]\s*\)""")


@dataclasses.dataclass(frozen=True)
class Position:
    line: int
    col: int


@dataclasses.dataclass(frozen=True)
class Range:
    start: Position
    end: Position


@dataclasses.dataclass
class Symbol:
    name: str
    fqname: str
    kind: str
    signature: Optional[str]
    file: str
    range: Range
    exported: bool


@dataclasses.dataclass
class FileRecord:
    path: str
    language: str
    kind: str
    sha256: str
    lines: int
    imports: list[dict[str, Any]]
    internal_deps: list[str]
    symbols: list[Symbol]
    api_endpoints: list[dict[str, Any]]


def _sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def _pos(line: int, col: int) -> Position:
    return Position(line=max(1, line), col=max(0, col))


def _range_from_ast(node: ast.AST) -> Range:
    start_line = getattr(node, "lineno", 1)
    start_col = getattr(node, "col_offset", 0)
    end_line = getattr(node, "end_lineno", start_line)
    end_col = getattr(node, "end_col_offset", start_col)
    return Range(start=_pos(start_line, start_col), end=_pos(end_line, end_col))


def _is_within_excludes(rel_path: str, excludes: list[str]) -> bool:
    parts = rel_path.split("/")
    for part in parts:
        if part in excludes:
            return True
    for pat in excludes:
        if "*" in pat or "?" in pat or "[" in pat:
            if fnmatch.fnmatch(rel_path, pat):
                return True
    return False


def _detect_file_kind(rel_path: str) -> str:
    name = rel_path.split("/")[-1]
    if name in CONFIG_FILE_NAMES:
        return "config"
    if rel_path.endswith((".md", ".txt")):
        return "doc"
    if rel_path.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico")):
        return "asset"
    if rel_path.endswith((".css", ".scss")):
        return "style"
    if rel_path.endswith((".html",)):
        return "markup"
    if rel_path.endswith((".sh",)):
        return "script"
    return "source"


def _detect_language(rel_path: str) -> str:
    name = rel_path.split("/")[-1]
    if name == "Dockerfile" or name.endswith(".Dockerfile"):
        return "dockerfile"
    if rel_path.endswith(".py"):
        return "python"
    if rel_path.endswith(".tsx"):
        return "tsx"
    if rel_path.endswith(".ts"):
        return "typescript"
    if rel_path.endswith(".jsx"):
        return "jsx"
    if rel_path.endswith(".js"):
        return "javascript"
    if rel_path.endswith(".json"):
        return "json"
    if rel_path.endswith((".yml", ".yaml")):
        return "yaml"
    if rel_path.endswith(".toml"):
        return "toml"
    if rel_path.endswith(".css"):
        return "css"
    if rel_path.endswith(".html"):
        return "html"
    if rel_path.endswith(".sh"):
        return "shell"
    return "unknown"


def _is_probably_exported_ts(kind: str, line: str) -> bool:
    if kind in {"function", "class", "interface", "type"}:
        return bool(re.search(r"^\s*export\b", line))
    if kind == "variable":
        return bool(re.search(r"^\s*export\b", line))
    return False


def _extract_ts_symbols(rel_path: str, text: str) -> list[Symbol]:
    symbols: list[Symbol] = []
    lines = text.splitlines()
    for i, line in enumerate(lines, start=1):
        for kind, pat in TS_SYMBOL_PATTERNS:
            m = re.search(pat, line)
            if not m:
                continue
            name = m.group("name")
            start_col = m.start("name")
            end_col = m.end("name")
            exported = _is_probably_exported_ts(kind, line)
            symbols.append(
                Symbol(
                    name=name,
                    fqname=name,
                    kind=kind,
                    signature=None,
                    file=rel_path,
                    range=Range(start=_pos(i, start_col), end=_pos(i, end_col)),
                    exported=exported,
                )
            )
            break
    return symbols


def _extract_ts_imports(rel_path: str, text: str) -> list[dict[str, Any]]:
    imports: list[dict[str, Any]] = []
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if not IMPORT_LINE_START_RE.search(line) and "require(" not in line:
            i += 1
            continue
        stmt_lines = [line]
        start_line = i + 1
        j = i
        while j + 1 < len(lines) and ";" not in lines[j] and not lines[j].strip().endswith(";"):
            j += 1
            stmt_lines.append(lines[j])
            if len(stmt_lines) > 20:
                break
            if ";" in lines[j]:
                break
        stmt = "\n".join(stmt_lines)
        spec: Optional[str] = None
        m_bare = IMPORT_BARE_RE.search(stmt)
        if m_bare:
            spec = m_bare.group("spec")
        m_from = IMPORT_FROM_RE.search(stmt)
        if m_from:
            spec = m_from.group("spec")
        if spec is None:
            m_req = REQUIRE_RE.search(stmt)
            if m_req:
                spec = m_req.group("spec")
        if spec is not None:
            imports.append(
                {
                    "specifier": spec,
                    "line": start_line,
                    "raw": stmt.strip(),
                }
            )
        i = j + 1
    return imports


def _resolve_ts_import(from_file: Path, spec: str, root: Path) -> Optional[str]:
    if spec.startswith("http://") or spec.startswith("https://"):
        return None
    if not spec.startswith("."):
        return None
    base = (from_file.parent / spec).resolve()
    candidates = []
    if base.suffix:
        candidates.append(base)
    else:
        candidates.extend(
            [
                Path(str(base) + ".ts"),
                Path(str(base) + ".tsx"),
                Path(str(base) + ".js"),
                Path(str(base) + ".jsx"),
                base / "index.ts",
                base / "index.tsx",
                base / "index.js",
                base / "index.jsx",
            ]
        )
    for c in candidates:
        try:
            c_res = c.resolve()
        except Exception:
            continue
        if c_res.is_file() and root in c_res.parents:
            return c_res.relative_to(root).as_posix()
    return None


def _resolve_python_import(module: Optional[str], level: int, from_file: Path, root: Path) -> Optional[str]:
    backend_root = root / "backend"
    try:
        from_rel = from_file.relative_to(backend_root)
    except Exception:
        return None
    base_dir = backend_root / from_rel.parent
    if level > 0:
        for _ in range(level):
            base_dir = base_dir.parent
    if module is None:
        return None
    parts = module.split(".")
    candidates = [
        base_dir.joinpath(*parts).with_suffix(".py"),
        base_dir.joinpath(*parts) / "__init__.py",
        backend_root.joinpath(*parts).with_suffix(".py"),
        backend_root.joinpath(*parts) / "__init__.py",
    ]
    for c in candidates:
        if c.is_file():
            try:
                return c.resolve().relative_to(root).as_posix()
            except Exception:
                continue
    return None


class _PythonIndexer(ast.NodeVisitor):
    def __init__(self, rel_path: str):
        self.rel_path = rel_path
        self.scope: list[str] = []
        self.symbols: list[Symbol] = []
        self.imports: list[dict[str, Any]] = []
        self.api_endpoints: list[dict[str, Any]] = []

    def _fqname(self, name: str) -> str:
        if not self.scope:
            return name
        return ".".join(self.scope + [name])

    def visit_Import(self, node: ast.Import) -> Any:
        for alias in node.names:
            self.imports.append(
                {
                    "module": alias.name,
                    "name": alias.asname or alias.name.split(".")[-1],
                    "kind": "import",
                    "line": getattr(node, "lineno", 1),
                }
            )
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> Any:
        module = node.module
        for alias in node.names:
            self.imports.append(
                {
                    "module": module,
                    "name": alias.asname or alias.name,
                    "kind": "from",
                    "level": getattr(node, "level", 0),
                    "line": getattr(node, "lineno", 1),
                }
            )
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef) -> Any:
        fq = self._fqname(node.name)
        self.symbols.append(
            Symbol(
                name=node.name,
                fqname=fq,
                kind="class",
                signature=None,
                file=self.rel_path,
                range=_range_from_ast(node),
                exported=True,
            )
        )
        self.scope.append(node.name)
        self.generic_visit(node)
        self.scope.pop()

    def _decorator_http(self, dec: ast.expr) -> Optional[dict[str, Any]]:
        if not isinstance(dec, ast.Call):
            return None
        func = dec.func
        method: Optional[str] = None
        if isinstance(func, ast.Attribute):
            method = func.attr
        elif isinstance(func, ast.Name):
            method = func.id
        if method is None:
            return None
        if method not in HTTP_DECORATOR_METHODS and method != "websocket":
            return None
        path: Optional[str] = None
        if dec.args:
            arg0 = dec.args[0]
            if isinstance(arg0, ast.Constant) and isinstance(arg0.value, str):
                path = arg0.value
        return {"method": method.upper(), "path": path}

    def _collect_api_endpoints(self, node: ast.AST, fn_name: str) -> None:
        decorators = getattr(node, "decorator_list", [])
        for dec in decorators:
            info = self._decorator_http(dec)
            if not info:
                continue
            self.api_endpoints.append(
                {
                    "protocol": "websocket" if info["method"] == "WEBSOCKET" else "http",
                    "method": info["method"],
                    "path": info["path"],
                    "handler": fn_name,
                    "line": getattr(node, "lineno", 1),
                    "file": self.rel_path,
                }
            )

    def visit_FunctionDef(self, node: ast.FunctionDef) -> Any:
        fq = self._fqname(node.name)
        self._collect_api_endpoints(node, fq)
        sig = _format_python_signature(node)
        self.symbols.append(
            Symbol(
                name=node.name,
                fqname=fq,
                kind="function",
                signature=sig,
                file=self.rel_path,
                range=_range_from_ast(node),
                exported=True,
            )
        )
        self.scope.append(node.name)
        self.generic_visit(node)
        self.scope.pop()

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> Any:
        fq = self._fqname(node.name)
        self._collect_api_endpoints(node, fq)
        sig = _format_python_signature(node)
        self.symbols.append(
            Symbol(
                name=node.name,
                fqname=fq,
                kind="function",
                signature=sig,
                file=self.rel_path,
                range=_range_from_ast(node),
                exported=True,
            )
        )
        self.scope.append(node.name)
        self.generic_visit(node)
        self.scope.pop()

    def visit_Assign(self, node: ast.Assign) -> Any:
        if self.scope:
            return
        targets = []
        for t in node.targets:
            if isinstance(t, ast.Name):
                targets.append(t.id)
        for name in targets:
            self.symbols.append(
                Symbol(
                    name=name,
                    fqname=name,
                    kind="variable",
                    signature=None,
                    file=self.rel_path,
                    range=_range_from_ast(node),
                    exported=True,
                )
            )


def _format_python_signature(node: ast.AST) -> Optional[str]:
    if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        return None
    a = node.args
    params: list[str] = []

    def _arg_str(arg: ast.arg, default: Optional[ast.expr]) -> str:
        name = arg.arg
        ann = None
        if arg.annotation is not None:
            ann = _expr_to_str(arg.annotation)
        s = name if ann is None else f"{name}: {ann}"
        if default is not None:
            s = f"{s} = {_expr_to_str(default)}"
        return s

    posonly = getattr(a, "posonlyargs", [])
    args = list(a.args)
    defaults = list(a.defaults)
    missing = len(args) - len(defaults)
    defaults = [None] * missing + defaults

    for arg, default in zip(posonly, [None] * len(posonly)):
        params.append(_arg_str(arg, default))
    if posonly:
        params.append("/")

    for arg, default in zip(args, defaults):
        params.append(_arg_str(arg, default))

    if a.vararg is not None:
        params.append("*" + _arg_str(a.vararg, None))
    elif a.kwonlyargs:
        params.append("*")

    for kwarg, default in zip(a.kwonlyargs, a.kw_defaults):
        params.append(_arg_str(kwarg, default))

    if a.kwarg is not None:
        params.append("**" + _arg_str(a.kwarg, None))

    ret = None
    if node.returns is not None:
        ret = _expr_to_str(node.returns)
    ret_s = "" if ret is None else f" -> {ret}"
    async_prefix = "async " if isinstance(node, ast.AsyncFunctionDef) else ""
    return f"{async_prefix}{node.name}({', '.join(params)}){ret_s}"


def _expr_to_str(expr: ast.AST) -> str:
    try:
        if isinstance(expr, ast.Constant):
            return repr(expr.value)
        return ast.unparse(expr)
    except Exception:
        return "<expr>"


def _serialize_symbol(s: Symbol) -> dict[str, Any]:
    return {
        "name": s.name,
        "fqname": s.fqname,
        "kind": s.kind,
        "signature": s.signature,
        "file": s.file,
        "range": {
            "start": {"line": s.range.start.line, "col": s.range.start.col},
            "end": {"line": s.range.end.line, "col": s.range.end.col},
        },
        "exported": s.exported,
    }


def _serialize_file_record(fr: FileRecord) -> dict[str, Any]:
    return {
        "path": fr.path,
        "language": fr.language,
        "kind": fr.kind,
        "sha256": fr.sha256,
        "lines": fr.lines,
        "imports": fr.imports,
        "internal_deps": fr.internal_deps,
        "symbols": [_serialize_symbol(s) for s in fr.symbols],
        "api_endpoints": fr.api_endpoints,
    }


def _make_index_schema() -> dict[str, Any]:
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "bv-pip-analysis.code-index.schema.json",
        "title": "BV PIP Analysis Code Index",
        "type": "object",
        "required": ["version", "root", "generatedAt", "files", "symbols", "graphs", "modules", "api", "tests"],
        "properties": {
            "version": {"type": "string"},
            "root": {"type": "string"},
            "generatedAt": {"type": "string"},
            "files": {"type": "array"},
            "symbols": {"type": "array"},
            "graphs": {"type": "object"},
            "modules": {"type": "array"},
            "api": {"type": "object"},
            "tests": {"type": "object"},
        },
    }


def _detect_modules(root: Path) -> list[dict[str, Any]]:
    modules = []
    if (root / "backend").is_dir():
        modules.append(
            {
                "name": "backend",
                "type": "python-fastapi",
                "root": "backend",
                "entrypoints": ["backend/main.py"],
            }
        )
    if (root / "frontend").is_dir():
        modules.append(
            {
                "name": "frontend",
                "type": "vite-react",
                "root": "frontend",
                "entrypoints": ["frontend/src/main.tsx", "frontend/src/App.tsx"],
            }
        )
    return modules


def _is_supported_source(language: str) -> bool:
    return language in {"python", "typescript", "tsx", "javascript", "jsx"}


def _index_file(root: Path, rel_path: str) -> FileRecord:
    abs_path = (root / rel_path).resolve()
    language = _detect_language(rel_path)
    kind = _detect_file_kind(rel_path)
    text = _read_text(abs_path)
    sha = _sha256_text(text)
    line_count = text.count("\n") + 1 if text else 0

    imports: list[dict[str, Any]] = []
    internal_deps: list[str] = []
    symbols: list[Symbol] = []
    endpoints: list[dict[str, Any]] = []

    if language == "python":
        try:
            tree = ast.parse(text, filename=rel_path)
            idx = _PythonIndexer(rel_path)
            idx.visit(tree)
            imports = idx.imports
            symbols = idx.symbols
            endpoints = idx.api_endpoints
        except SyntaxError:
            imports = []
            symbols = []
            endpoints = []
    elif language in {"typescript", "tsx", "javascript", "jsx"}:
        imports = _extract_ts_imports(rel_path, text)
        symbols = _extract_ts_symbols(rel_path, text)
        endpoints = []

    if _is_supported_source(language):
        if language == "python":
            for imp in imports:
                module = imp.get("module")
                level = int(imp.get("level", 0) or 0)
                dep = _resolve_python_import(module, level, abs_path, root)
                if dep is not None and dep not in internal_deps:
                    internal_deps.append(dep)
        else:
            for imp in imports:
                spec = imp.get("specifier")
                if isinstance(spec, str):
                    dep = _resolve_ts_import(abs_path, spec, root)
                    if dep is not None and dep not in internal_deps:
                        internal_deps.append(dep)

    return FileRecord(
        path=rel_path,
        language=language,
        kind=kind,
        sha256=sha,
        lines=line_count,
        imports=imports,
        internal_deps=internal_deps,
        symbols=symbols,
        api_endpoints=endpoints,
    )


def _iter_repo_files(root: Path, excludes: list[str]) -> Iterable[str]:
    for dirpath, dirnames, filenames in os.walk(root):
        dirpath_p = Path(dirpath)
        rel_dir = dirpath_p.relative_to(root).as_posix()
        if rel_dir == ".":
            rel_dir = ""
        if rel_dir and _is_within_excludes(rel_dir, excludes):
            dirnames[:] = []
            continue
        dirnames[:] = [d for d in dirnames if not _is_within_excludes((f"{rel_dir}/{d}" if rel_dir else d), excludes)]
        for fn in filenames:
            rel = f"{rel_dir}/{fn}" if rel_dir else fn
            if _is_within_excludes(rel, excludes):
                continue
            yield rel


def _build_graphs(files: list[FileRecord]) -> dict[str, Any]:
    deps_by_file: dict[str, list[str]] = {f.path: sorted(set(f.internal_deps)) for f in files}
    dependents_by_file: dict[str, list[str]] = {f.path: [] for f in files}
    for src, deps in deps_by_file.items():
        for dep in deps:
            dependents_by_file.setdefault(dep, []).append(src)
    for k in list(dependents_by_file.keys()):
        dependents_by_file[k] = sorted(set(dependents_by_file[k]))
    return {
        "depsByFile": deps_by_file,
        "dependentsByFile": dependents_by_file,
    }


def _collect_api(files: list[FileRecord]) -> dict[str, Any]:
    http_eps = []
    ws_eps = []
    for f in files:
        for ep in f.api_endpoints:
            if ep.get("protocol") == "websocket":
                ws_eps.append(ep)
            else:
                http_eps.append(ep)
    http_eps = sorted(http_eps, key=lambda e: (e.get("file", ""), int(e.get("line", 0))))
    ws_eps = sorted(ws_eps, key=lambda e: (e.get("file", ""), int(e.get("line", 0))))
    return {"http": http_eps, "websocket": ws_eps}


def _collect_tests(files: list[FileRecord]) -> dict[str, Any]:
    test_files = []
    for f in files:
        p = f.path
        if re.search(r"(^|/)(tests?|__tests__)/", p):
            test_files.append(p)
        if re.search(r"(^|/).*(_test|test_)\.py$", p):
            test_files.append(p)
        if re.search(r"\.(spec|test)\.(ts|tsx|js|jsx)$", p):
            test_files.append(p)
    test_files = sorted(set(test_files))
    frameworks = []
    return {"files": test_files, "frameworks": frameworks}


def _symbols_index(symbols: list[Symbol]) -> dict[str, Any]:
    by_name: dict[str, list[dict[str, Any]]] = {}
    for s in symbols:
        by_name.setdefault(s.name, []).append(
            {
                "fqname": s.fqname,
                "kind": s.kind,
                "file": s.file,
                "start": {"line": s.range.start.line, "col": s.range.start.col},
            }
        )
    for k in list(by_name.keys()):
        by_name[k] = sorted(by_name[k], key=lambda r: (r["file"], r["start"]["line"], r["start"]["col"]))
    return {"byName": by_name}


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, sort_keys=False) + "\n", encoding="utf-8")


def _write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, separators=(",", ":"), ensure_ascii=False) + "\n")


def _line_at(path: Path, line: int) -> str:
    try:
        with path.open("r", encoding="utf-8", errors="ignore") as f:
            for i, l in enumerate(f, start=1):
                if i == line:
                    return l.rstrip("\n")
    except Exception:
        return ""
    return ""


def _write_ctags(root: Path, out_path: Path, symbols: list[Symbol]) -> None:
    lines = [
        "!_TAG_FILE_FORMAT\t2\t/extended format/",
        "!_TAG_FILE_SORTED\t1\t/0=unsorted, 1=sorted/",
    ]
    for s in symbols:
        rel = s.file
        abs_file = root / rel
        addr_line = s.range.start.line
        kind = s.kind[0] if s.kind else "s"
        text_line = _line_at(abs_file, addr_line).replace("\\", "\\\\").replace("/", "\\/")
        pattern = f"/^{text_line}$/"
        ex_cmd = pattern if text_line else str(addr_line)
        lines.append(f"{s.name}\t{rel}\t{ex_cmd};\"\t{kind}\tline:{addr_line}")
    lines = sorted(set(lines[2:]))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(["!_TAG_FILE_FORMAT\t2\t/extended format/", "!_TAG_FILE_SORTED\t1\t/0=unsorted, 1=sorted/"] + lines) + "\n", encoding="utf-8")


def build_index(root: Path, excludes: list[str]) -> dict[str, Any]:
    file_paths = sorted(_iter_repo_files(root, excludes))
    file_records = []
    for rel in file_paths:
        lang = _detect_language(rel)
        if lang == "unknown" and _detect_file_kind(rel) == "asset":
            continue
        file_records.append(_index_file(root, rel))

    all_symbols: list[Symbol] = []
    for f in file_records:
        all_symbols.extend(f.symbols)

    graphs = _build_graphs(file_records)
    api = _collect_api(file_records)
    tests = _collect_tests(file_records)
    modules = _detect_modules(root)

    generated_at = _dt.datetime.now(tz=_dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return {
        "version": "1.0",
        "root": str(root.resolve()),
        "generatedAt": generated_at,
        "files": [_serialize_file_record(fr) for fr in file_records],
        "symbols": [_serialize_symbol(s) for s in all_symbols],
        "graphs": graphs,
        "modules": modules,
        "api": api,
        "tests": tests,
        "symbolIndex": _symbols_index(all_symbols),
    }


def _snapshot_state(root: Path, excludes: list[str]) -> dict[str, Any]:
    state = {}
    for rel in _iter_repo_files(root, excludes):
        p = root / rel
        try:
            st = p.stat()
            state[rel] = {"mtime": st.st_mtime, "size": st.st_size}
        except FileNotFoundError:
            continue
    return state


def _diff_state(prev: dict[str, Any], curr: dict[str, Any]) -> tuple[set[str], set[str]]:
    prev_keys = set(prev.keys())
    curr_keys = set(curr.keys())
    deleted = prev_keys - curr_keys
    changed = set()
    for k in curr_keys:
        if k not in prev:
            changed.add(k)
            continue
        if prev[k].get("mtime") != curr[k].get("mtime") or prev[k].get("size") != curr[k].get("size"):
            changed.add(k)
    return changed, deleted


def write_outputs(root: Path, out_dir: Path, index: dict[str, Any]) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    _write_json(out_dir / "index.json", index)
    _write_json(out_dir / "index.schema.json", _make_index_schema())

    files_rows = index.get("files", [])
    symbols_rows = index.get("symbols", [])
    _write_jsonl(out_dir / "files.jsonl", list(files_rows))
    _write_jsonl(out_dir / "symbols.jsonl", list(symbols_rows))
    _write_json(out_dir / "deps.json", index.get("graphs", {}))
    _write_json(out_dir / "api.json", index.get("api", {}))
    _write_json(out_dir / "modules.json", index.get("modules", []))
    _write_json(out_dir / "tests.json", index.get("tests", {}))
    _write_json(out_dir / "symbol_index.json", index.get("symbolIndex", {}))

    symbols = []
    for s in symbols_rows:
        try:
            r = s["range"]["start"]
            symbols.append(
                Symbol(
                    name=s["name"],
                    fqname=s["fqname"],
                    kind=s["kind"],
                    signature=s.get("signature"),
                    file=s["file"],
                    range=Range(start=_pos(int(r["line"]), int(r["col"])), end=_pos(int(r["line"]), int(r["col"]))),
                    exported=bool(s.get("exported", True)),
                )
            )
        except Exception:
            continue
    _write_ctags(root, out_dir / "tags", symbols)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="code_indexer")
    parser.add_argument("--root", default=".", help="Repository root directory")
    parser.add_argument("--out", default=".code_index", help="Output directory (relative to root)")
    parser.add_argument("--watch", action="store_true", help="Continuously re-index on file changes")
    parser.add_argument("--interval", type=float, default=1.0, help="Watch polling interval in seconds")
    parser.add_argument("--exclude", action="append", default=[], help="Additional exclude directory or glob")
    args = parser.parse_args(argv)

    root = Path(args.root).resolve()
    out_dir = (root / args.out).resolve()
    excludes = DEFAULT_EXCLUDES + list(args.exclude or [])

    index = build_index(root, excludes)
    write_outputs(root, out_dir, index)

    if not args.watch:
        return 0

    prev_state = _snapshot_state(root, excludes)
    while True:
        time.sleep(max(0.1, float(args.interval)))
        curr_state = _snapshot_state(root, excludes)
        changed, deleted = _diff_state(prev_state, curr_state)
        if not changed and not deleted:
            continue
        index = build_index(root, excludes)
        write_outputs(root, out_dir, index)
        prev_state = curr_state


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
