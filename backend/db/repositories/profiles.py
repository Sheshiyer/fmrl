"""Repositories for Selene user profile and preference data."""
from __future__ import annotations

from uuid import UUID

from db.repositories.base import BaseRepository


class UserProfilesRepository(BaseRepository):
    async def user_exists(self, user_id: UUID) -> bool:
        row = await self.fetch_one(
            "select id from public.users where id = :user_id limit 1",
            {"user_id": str(user_id)},
        )
        return row is not None

    async def get_profile(self, user_id: UUID):
        return await self.fetch_one(
            "select * from public.user_profiles where user_id = :user_id limit 1",
            {"user_id": str(user_id)},
        )

    async def upsert_preferences(self, user_id: UUID, preferences: dict):
        sql = """
        insert into public.user_profiles (
            user_id,
            preferences
        ) values (
            :user_id,
            cast(:preferences as jsonb)
        )
        on conflict (user_id) do update
        set
            preferences = cast(:preferences as jsonb),
            updated_at = now()
        returning *
        """
        return await self.execute_returning(
            sql,
            {
                "user_id": str(user_id),
                "preferences": self._json(preferences),
            },
        )
