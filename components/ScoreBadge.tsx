export default function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-100 text-emerald-800"
      : score >= 60
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-800";
  return <span className={`badge ${color} font-semibold`}>{score}%</span>;
}
