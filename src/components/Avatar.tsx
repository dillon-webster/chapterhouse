// Round avatar with an initials fallback. Presentational — the caller decides
// whether the user has an uploaded avatar (served at /api/users/<id>/avatar).

const SIZES = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
} as const;

export function Avatar({
  userId,
  name,
  hasAvatar,
  size = "md",
}: {
  userId: string;
  name: string;
  hasAvatar: boolean;
  size?: keyof typeof SIZES;
}) {
  const initials = name.slice(0, 2).toUpperCase();
  const cls = `flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-bold text-paper ${SIZES[size]}`;

  if (hasAvatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/users/${userId}/avatar`}
        alt={name}
        className={`${cls} object-cover`}
      />
    );
  }
  return (
    <div className={cls} aria-label={name}>
      {initials}
    </div>
  );
}
