require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const dynamics = require('../services/dynamics');

async function findAndFetchBewerbungsdaten() {
  console.log('1) Verbindung testen (WhoAmI)...');
  try {
    const whoami = await dynamics.testConnection();
    console.log('   Verbunden als:', JSON.stringify(whoami, null, 2));
  } catch (e) {
    console.error('   Verbindung fehlgeschlagen:', e.message);
    process.exit(1);
  }

  console.log('\n2) Suche nach Tabelle "bewerbung*"...');
  try {
    const entities = await dynamics.get(
      "EntityDefinitions?$select=LogicalName,LogicalCollectionName,DisplayName&$filter=contains(LogicalName,'bewerbung')"
    );
    if (entities.value && entities.value.length > 0) {
      console.log('   Gefundene Tabellen:');
      entities.value.forEach(e => {
        const label = e.DisplayName?.UserLocalizedLabel?.Label || '-';
        console.log(`   - ${e.LogicalName} (API: ${e.LogicalCollectionName}) → "${label}"`);
      });

      const collectionName = entities.value[0].LogicalCollectionName;
      console.log(`\n3) Lade alle Daten aus "${collectionName}"...`);
      const data = await dynamics.get(collectionName);
      console.log(`   ${data.value ? data.value.length : 0} Datensätze gefunden.\n`);
      console.log(JSON.stringify(data.value, null, 2));
    } else {
      console.log('   Keine Tabelle mit "bewerbung" im Namen gefunden.');
      console.log('   Versuche gängige Varianten...');

      const variants = [
        'bewerbungsdatens',
        'cr_bewerbungsdatens',
        'new_bewerbungsdatens',
        'bcw_bewerbungsdatens',
        'fom_bewerbungsdatens',
      ];

      for (const name of variants) {
        try {
          console.log(`   Versuche "${name}"...`);
          const data = await dynamics.get(name + '?$top=1');
          console.log(`   GEFUNDEN: ${name}`);
          const allData = await dynamics.get(name);
          console.log(`   ${allData.value ? allData.value.length : 0} Datensätze:\n`);
          console.log(JSON.stringify(allData.value, null, 2));
          return;
        } catch (e) {
          console.log(`   "${name}" → nicht gefunden`);
        }
      }
      console.log('\n   Keine passende Tabelle gefunden. Alle Tabellen auflisten:');
      const all = await dynamics.get("EntityDefinitions?$select=LogicalName&$filter=IsCustomEntity eq true");
      if (all.value) {
        all.value.forEach(e => console.log(`   - ${e.LogicalName}`));
      }
    }
  } catch (e) {
    console.error('Fehler:', e.message);
  }
}

findAndFetchBewerbungsdaten();
