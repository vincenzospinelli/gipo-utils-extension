import {SettingsSection} from "../SettingsSection";

export function WheelTeamSection({
  people,
  updateWheelPerson,
  removeWheelPerson,
  addWheelPerson,
  onShuffle,
  onReset,
}) {
  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Team"
        description="Modifica i nomi della ruota. Ogni riga rappresenta una slice."
      >
        <div className="flex flex-col gap-2">
          {people.map((person, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder={`Partecipante ${index + 1}`}
                value={person.name}
                onChange={(event) => updateWheelPerson(index, event.target.value)}
                className="flex-1 border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => removeWheelPerson(index)}
                className="text-red-600 hover:text-red-800 disabled:text-gray-400"
              >
                Rimuovi
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addWheelPerson}
            className="self-start bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded"
          >
            Aggiungi
          </button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Strumenti elenco"
        description="Mischia l'ordine o ripristina l'elenco di default."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onShuffle}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded"
          >
            Mischia elenco
          </button>
          <button
            onClick={onReset}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
          >
            Ripristina elenco iniziale
          </button>
        </div>
      </SettingsSection>
    </div>
  );
}
