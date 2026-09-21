# Backend-instructies

- Deze backend moet een REST API zijn.
- Ontwerp nieuwe endpoints rond resources en gebruik passende HTTP-methoden en statuscodes.
- Gebruik JSON voor request- en responsebodies, tenzij een endpoint een ander formaat nodig heeft (zoals een bestand).

## Git-commits en controles

- Als je gevraagd wordt commits te maken, controleer dan direct vooraf `git status --short` en `git diff --cached --name-status`. De staging area in de IDE kan intussen zijn veranderd.
- Maak kleine commits per onderwerp, bijvoorbeeld dependencies, een backendresource, databasewijzigingen en infrastructuur. Geef iedere commit een duidelijke beschrijving van het resultaat.
- Stage alleen de bestanden die bij de betreffende commit horen. Als ander werk al staged is, gebruik expliciete paden met `git commit --only` zodat dat werk staged blijft.
- Controleer na iedere commit de lijst met gecommitte bestanden. Controleer aan het eind de Git-status en rapporteer de commit-hashes, de inhoud per commit en eventueel overgebleven werk.
- Neem frontendbestanden niet mee in een backendcommit en laat niet-gerelateerde of niet-getrackte bestanden ongemoeid.
- Voer builds, tests, lint en andere validatie buiten de sandbox uit. Probeer deze controles niet eerst binnen de sandbox.
