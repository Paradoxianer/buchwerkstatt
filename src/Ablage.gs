/**
 * Zugriff auf Google Drive – nur über die Drive-API (erweiterter Dienst „Drive“, v3)
 * mit der Berechtigung drive.file. Damit sieht die Buchwerkstatt ausschließlich
 * Dateien, die sie selbst angelegt hat (Tabelle, Personenblätter, Ordner), und
 * nicht den Rest des Google Drive. Das ist Voraussetzung für den Marketplace.
 *
 * Alles, was die Buchwerkstatt anlegt, landet in einem Ordner
 * „<Buch> – Buchwerkstatt“ – nach Möglichkeit neben dem Manuskript, sonst in
 * „Meine Ablage“ (mit drive.file darf das Add-on fremde Ordner nicht immer sehen).
 */

var BW_PROP_BUCHORDNER = 'BW_BUCHORDNER';
var BW_ORDNER_TYP = 'application/vnd.google-apps.folder';

/** Infos zu einer Datei ({ id, name, trashed, parents }) – oder null, wenn sie nicht erreichbar ist. */
function dateiInfo_(id) {
  if (!id) return null;
  try {
    return Drive.Files.get(id, { fields: 'id,name,trashed,parents', supportsAllDrives: true });
  } catch (err) {
    return null;
  }
}

function dateiNutzbar_(id) {
  var info = dateiInfo_(id);
  return !!(info && !info.trashed);
}

function dateiUmbenennen_(id, name) {
  Drive.Files.update({ name: name }, id, null, { supportsAllDrives: true });
}

function dateiInPapierkorb_(id) {
  try {
    Drive.Files.update({ trashed: true }, id, null, { supportsAllDrives: true });
  } catch (err) {
    // Datei gibt es nicht mehr oder sie ist nicht erreichbar – nichts zu tun.
  }
}

/** Verschiebt eine (selbst angelegte) Datei in einen Ordner. */
function dateiVerschieben_(id, ordnerId) {
  var info = dateiInfo_(id);
  if (!info || !ordnerId) return;
  var alt = (info.parents || []).filter(function (p) { return p !== ordnerId; });
  Drive.Files.update({}, id, null, {
    addParents: ordnerId,
    removeParents: alt.join(','),
    supportsAllDrives: true
  });
}

/** Legt einen Ordner an – im Wunsch-Elternordner, sonst in „Meine Ablage“. */
function ordnerAnlegen_(name, elternId) {
  if (elternId) {
    try {
      return Drive.Files.create({ name: name, mimeType: BW_ORDNER_TYP, parents: [elternId] }, null, { supportsAllDrives: true }).id;
    } catch (err) {
      // Kein Zugriff auf den Elternordner – dann eben in „Meine Ablage“.
    }
  }
  return Drive.Files.create({ name: name, mimeType: BW_ORDNER_TYP }).id;
}

/** Ordner „<Buch> – Buchwerkstatt“ für Tabelle und Personenblätter. */
function buchOrdner_() {
  var props = PropertiesService.getDocumentProperties();
  var id = props.getProperty(BW_PROP_BUCHORDNER);
  if (id && dateiNutzbar_(id)) return id;
  var doc = DocumentApp.getActiveDocument();
  var manuskript = dateiInfo_(doc.getId());
  var eltern = manuskript && manuskript.parents ? manuskript.parents[0] : null;
  id = ordnerAnlegen_(doc.getName() + ' – Buchwerkstatt', eltern);
  props.setProperty(BW_PROP_BUCHORDNER, id);
  return id;
}
