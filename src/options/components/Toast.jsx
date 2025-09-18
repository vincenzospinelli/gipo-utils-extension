export function Toast({message}) {
  if (!message) return null;
  return (
    <div className="fixed top-16 right-6 z-50 bg-gray-900 text-white text-sm px-3 py-2 rounded shadow">
      {message}
    </div>
  );
}
