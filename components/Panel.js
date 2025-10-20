export default function Panel({ title, children }) {
  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
      <h2 className="text-lg mb-2">{title}</h2>
      {children}
    </div>
  );
}
