"""Repositories for Biofield extension tables."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import text

from db.repositories.base import BaseRepository
from models.persistence import (
    BaselineCreate,
    BiofieldArtifactCreate,
    BiofieldSessionCreate,
    BiofieldSessionUpdate,
    BiofieldSnapshotCreate,
    HistoryQuery,
    TimelineBatchCreate,
)


class BiofieldSessionsRepository(BaseRepository):
    async def create_session(self, payload: BiofieldSessionCreate):
        sql = """
        insert into public.biofield_sessions (
            user_id,
            status,
            analysis_mode,
            analysis_region,
            source_kind,
            summary_reading_id,
            latest_snapshot_id,
            started_at,
            paused_at,
            ended_at,
            duration_seconds,
            score_recipe_version,
            metric_recipe_version,
            metadata
        ) values (
            :user_id,
            :status,
            :analysis_mode,
            :analysis_region,
            :source_kind,
            :summary_reading_id,
            :latest_snapshot_id,
            coalesce(:started_at, now()),
            :paused_at,
            :ended_at,
            :duration_seconds,
            :score_recipe_version,
            :metric_recipe_version,
            cast(:metadata as jsonb)
        )
        returning id, user_id, status, started_at, created_at
        """
        return await self.execute_returning(
            sql,
            {
                "user_id": str(payload.user_id),
                "status": payload.status,
                "analysis_mode": payload.analysis_mode,
                "analysis_region": payload.analysis_region,
                "source_kind": payload.source_kind,
                "summary_reading_id": str(payload.summary_reading_id) if payload.summary_reading_id else None,
                "latest_snapshot_id": str(payload.latest_snapshot_id) if payload.latest_snapshot_id else None,
                "started_at": payload.started_at,
                "paused_at": payload.paused_at,
                "ended_at": payload.ended_at,
                "duration_seconds": payload.duration_seconds,
                "score_recipe_version": payload.score_recipe_version,
                "metric_recipe_version": payload.metric_recipe_version,
                "metadata": self._json(payload.metadata),
            },
        )

    async def update_session(self, session_id: UUID, payload: BiofieldSessionUpdate):
        sql = """
        update public.biofield_sessions
        set
            status = coalesce(:status, status),
            latest_snapshot_id = coalesce(:latest_snapshot_id, latest_snapshot_id),
            summary_reading_id = coalesce(:summary_reading_id, summary_reading_id),
            paused_at = case
                when :paused_at_set then :paused_at
                else paused_at
            end,
            ended_at = case
                when :ended_at_set then :ended_at
                else ended_at
            end,
            duration_seconds = coalesce(:duration_seconds, duration_seconds),
            metadata = coalesce(cast(:metadata as jsonb), metadata),
            updated_at = now()
        where id = :session_id
        returning id, user_id, status, latest_snapshot_id, summary_reading_id, paused_at, ended_at, duration_seconds, updated_at
        """
        return await self.execute_returning(
            sql,
            {
                "session_id": str(session_id),
                "status": payload.status,
                "latest_snapshot_id": str(payload.latest_snapshot_id) if payload.latest_snapshot_id else None,
                "summary_reading_id": str(payload.summary_reading_id) if payload.summary_reading_id else None,
                "paused_at": payload.paused_at,
                "paused_at_set": payload.paused_at_set,
                "ended_at": payload.ended_at,
                "ended_at_set": payload.ended_at_set,
                "duration_seconds": payload.duration_seconds,
                "metadata": self._json(payload.metadata) if payload.metadata is not None else None,
            },
        )

    async def get_session(self, session_id: UUID):
        return await self.fetch_one(
            "select * from public.biofield_sessions where id = :session_id limit 1",
            {"session_id": str(session_id)},
        )

    async def list_sessions(self, query: HistoryQuery):
        sql = """
        select *
        from public.biofield_session_summary
        where user_id = :user_id
        order by started_at desc
        limit :limit offset :offset
        """
        return await self.fetch_all(
            sql,
            {
                "user_id": str(query.user_id),
                "limit": query.limit,
                "offset": query.offset,
            },
        )


class BiofieldArtifactsRepository(BaseRepository):
    async def create_artifact(self, payload: BiofieldArtifactCreate):
        sql = """
        insert into public.biofield_artifacts (
            user_id,
            artifact_type,
            storage_bucket,
            storage_path,
            content_type,
            byte_size,
            linked_session_id,
            linked_snapshot_id,
            linked_reading_id,
            checksum_sha256,
            metadata
        ) values (
            :user_id,
            :artifact_type,
            :storage_bucket,
            :storage_path,
            :content_type,
            :byte_size,
            :linked_session_id,
            :linked_snapshot_id,
            :linked_reading_id,
            :checksum_sha256,
            cast(:metadata as jsonb)
        )
        returning id, artifact_type, storage_bucket, storage_path, created_at
        """
        return await self.execute_returning(
            sql,
            {
                "user_id": str(payload.user_id),
                "artifact_type": payload.artifact_type,
                "storage_bucket": payload.storage_bucket,
                "storage_path": payload.storage_path,
                "content_type": payload.content_type,
                "byte_size": payload.byte_size,
                "linked_session_id": str(payload.linked_session_id) if payload.linked_session_id else None,
                "linked_snapshot_id": str(payload.linked_snapshot_id) if payload.linked_snapshot_id else None,
                "linked_reading_id": str(payload.linked_reading_id) if payload.linked_reading_id else None,
                "checksum_sha256": payload.checksum_sha256,
                "metadata": self._json(payload.metadata),
            },
        )


class BiofieldSnapshotsRepository(BaseRepository):
    async def create_snapshot(self, payload: BiofieldSnapshotCreate):
        sql = """
        insert into public.biofield_snapshots (
            user_id,
            session_id,
            reading_id,
            label,
            capture_mode,
            analysis_region,
            source_kind,
            original_artifact_id,
            processed_artifact_id,
            captured_at,
            metadata
        ) values (
            :user_id,
            :session_id,
            :reading_id,
            :label,
            :capture_mode,
            :analysis_region,
            :source_kind,
            :original_artifact_id,
            :processed_artifact_id,
            coalesce(:captured_at, now()),
            cast(:metadata as jsonb)
        )
        returning id, user_id, session_id, reading_id, captured_at, created_at
        """
        return await self.execute_returning(
            sql,
            {
                "user_id": str(payload.user_id),
                "session_id": str(payload.session_id) if payload.session_id else None,
                "reading_id": str(payload.reading_id) if payload.reading_id else None,
                "label": payload.label,
                "capture_mode": payload.capture_mode,
                "analysis_region": payload.analysis_region,
                "source_kind": payload.source_kind,
                "original_artifact_id": str(payload.original_artifact_id) if payload.original_artifact_id else None,
                "processed_artifact_id": str(payload.processed_artifact_id) if payload.processed_artifact_id else None,
                "captured_at": payload.captured_at,
                "metadata": self._json(payload.metadata),
            },
        )

    async def get_snapshot(self, snapshot_id: UUID):
        return await self.fetch_one(
            "select * from public.biofield_snapshot_detail where id = :snapshot_id limit 1",
            {"snapshot_id": str(snapshot_id)},
        )

    async def list_snapshots(self, query: HistoryQuery):
        sql = """
        select *
        from public.biofield_snapshots
        where user_id = :user_id
          and (cast(:session_id as uuid) is null or session_id = cast(:session_id as uuid))
        order by captured_at desc
        limit :limit offset :offset
        """
        return await self.fetch_all(
            sql,
            {
                "user_id": str(query.user_id),
                "session_id": str(query.session_id) if query.session_id else None,
                "limit": query.limit,
                "offset": query.offset,
            },
        )


class BiofieldTimelineRepository(BaseRepository):
    async def insert_batch(self, payload: TimelineBatchCreate):
        inserted = []
        for point in payload.points:
            row = await self.execute_returning(
                """
                insert into public.biofield_timeline_points (
                    session_id,
                    user_id,
                    sample_index,
                    sample_time_ms,
                    score_vector,
                    metric_vector,
                    source_kind,
                    score_recipe_version,
                    metric_recipe_version
                ) values (
                    :session_id,
                    :user_id,
                    :sample_index,
                    :sample_time_ms,
                    cast(:score_vector as jsonb),
                    cast(:metric_vector as jsonb),
                    :source_kind,
                    :score_recipe_version,
                    :metric_recipe_version
                )
                on conflict (session_id, sample_index) do update
                set
                    sample_time_ms = excluded.sample_time_ms,
                    score_vector = excluded.score_vector,
                    metric_vector = excluded.metric_vector,
                    source_kind = excluded.source_kind,
                    score_recipe_version = excluded.score_recipe_version,
                    metric_recipe_version = excluded.metric_recipe_version
                returning id, session_id, sample_index, sample_time_ms, created_at
                """,
                {
                    "session_id": str(payload.session_id),
                    "user_id": str(payload.user_id),
                    "sample_index": point.sample_index,
                    "sample_time_ms": point.sample_time_ms,
                    "score_vector": self._json(point.score_vector),
                    "metric_vector": self._json(point.metric_vector),
                    "source_kind": point.source_kind,
                    "score_recipe_version": point.score_recipe_version,
                    "metric_recipe_version": point.metric_recipe_version,
                },
            )
            if row:
                inserted.append(row)
        return inserted

    async def list_for_session(self, session_id: UUID):
        return await self.fetch_all(
            """
            select *
            from public.biofield_timeline_points
            where session_id = :session_id
            order by sample_index asc
            """,
            {"session_id": str(session_id)},
        )


class BiofieldBaselinesRepository(BaseRepository):
    async def create_baseline(self, payload: BaselineCreate):
        sql = """
        insert into public.biofield_baselines (
            user_id,
            name,
            is_active,
            source_session_id,
            source_snapshot_id,
            source_reading_id,
            baseline_scores,
            baseline_metrics,
            provenance
        ) values (
            :user_id,
            :name,
            :is_active,
            :source_session_id,
            :source_snapshot_id,
            :source_reading_id,
            cast(:baseline_scores as jsonb),
            cast(:baseline_metrics as jsonb),
            cast(:provenance as jsonb)
        )
        returning id, user_id, name, is_active, created_at
        """
        return await self.execute_returning(
            sql,
            {
                "user_id": str(payload.user_id),
                "name": payload.name,
                "is_active": payload.is_active,
                "source_session_id": str(payload.source_session_id) if payload.source_session_id else None,
                "source_snapshot_id": str(payload.source_snapshot_id) if payload.source_snapshot_id else None,
                "source_reading_id": str(payload.source_reading_id) if payload.source_reading_id else None,
                "baseline_scores": self._json(payload.baseline_scores),
                "baseline_metrics": self._json(payload.baseline_metrics),
                "provenance": self._json(payload.provenance),
            },
        )

    async def activate_baseline(self, baseline_id: UUID, user_id: UUID):
        await self.session.execute(
            text(
                "update public.biofield_baselines set is_active = false, updated_at = now() where user_id = :user_id"
            ),
            {"user_id": str(user_id)},
        )
        return await self.execute_returning(
            """
            update public.biofield_baselines
            set is_active = true, updated_at = now()
            where id = :baseline_id and user_id = :user_id
            returning id, user_id, name, is_active, updated_at
            """,
            {"baseline_id": str(baseline_id), "user_id": str(user_id)},
        )

    async def get_active_baseline(self, user_id: UUID):
        return await self.fetch_one(
            """
            select *
            from public.biofield_baselines
            where user_id = :user_id and is_active = true
            order by updated_at desc, created_at desc
            limit 1
            """,
            {"user_id": str(user_id)},
        )

    async def delete_baseline(self, baseline_id: UUID, user_id: UUID):
        return await self.execute_returning(
            """
            delete from public.biofield_baselines
            where id = :baseline_id and user_id = :user_id
            returning id, user_id, name, is_active
            """,
            {"baseline_id": str(baseline_id), "user_id": str(user_id)},
        )
