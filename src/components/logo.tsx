// TimeCraft wordmark, shared by the sidebar and the login card (both on a dark background).
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="block">
      <span className={`font-extrabold tracking-tight text-white ${size === "lg" ? "text-2xl" : "text-xl"}`}>
        Time<span className="text-brand-light">Craft</span>
      </span>
      <span className="mt-0.5 block text-xs font-medium uppercase tracking-wider text-white/50">Projects · Tasks · Memory</span>
    </span>
  );
}
