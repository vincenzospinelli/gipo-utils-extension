import {SettingsSection} from "../SettingsSection";

export function TimerPeopleSection({people, updatePerson, removePerson, addPerson}) {
  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Persone"
        description="Aggiorna l’elenco del team e associa i relativi Jira ID."
      >
        <div className="flex flex-col gap-2">
          {people.map((person, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Nome"
                value={person.name}
                onChange={(event) => updatePerson(index, "name", event.target.value)}
                className="flex-grow border rounded p-2"
              />
              <input
                type="text"
                placeholder="Jira ID (opzionale)"
                value={person.jiraId || ""}
                onChange={(event) => updatePerson(index, "jiraId", event.target.value)}
                className="w-full border rounded p-2"
              />
              <button
                type="button"
                onClick={() => removePerson(index)}
                className="text-red-600 hover:text-red-800 disabled:text-gray-400"
              >
                Rimuovi
              </button>
            </div>
          ))}
        </div>
        <button
          id="add-person"
          type="button"
          onClick={addPerson}
          className="self-start bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded"
        >
          Aggiungi
        </button>
      </SettingsSection>
    </div>
  );
}
