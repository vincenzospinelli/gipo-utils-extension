export function SettingsSection({title, description, children}) {
  return (
    <section className="border border-gray-200 rounded-lg bg-gray-50 p-4 flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
