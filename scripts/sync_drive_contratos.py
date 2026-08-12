#!/usr/bin/env python3
"""
Sincroniza contratos PDF locales con carpetas de Google Drive.

Para cada edificio escanea las carpetas organizadas localmente:
  - Si la carpeta ya tiene folder_id en el CSV: sube los archivos que faltan en Drive
  - Si la carpeta NO tiene folder_id: crea la carpeta en Drive bajo el mismo padre,
    sube todos sus archivos, y registra el nuevo ID en el CSV

Uso:
  pip install google-api-python-client google-auth
  python scripts/sync_drive_contratos.py
"""

import csv, re
from pathlib import Path
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2 import service_account

# ── Configuración ──────────────────────────────────────────────────────────────

ROOT = Path(__file__).parent.parent
CREDS_JSON = ROOT / 'visor-de-rent-roll-situ-77333dd6d7c0.json'

BASE = Path(r'C:\Users\Cynthia Castro\Desktop\Dev\Due Dilligence INSITU 20260812')

# Carpetas locales por edificio (puedes agregar más en la lista si hay más versiones)
SOURCES = {
    'ech': [
        BASE / 'contratos-rm_santiago_echaurren_378-1786543243041-ba7cbc6d',
        BASE / 'contratos-rm_santiago_echaurren_378-1786564514568-b3f244f6',
    ],
    'irr': [
        BASE / 'contratos-rm_nunoa_avenidairarrazaval_2177-1786545449957-acf346db',
        BASE / 'contratos-rm_nunoa_avenidairarrazaval_2177-1786564743830-121e4c64',
    ],
}

CSV_FILES = {
    'ech': ROOT / 'data' / 'drive-folders-ech.csv',
    'irr': ROOT / 'data' / 'drive-folders-irr.csv',
}

FOLDER_PATTERNS = {
    'depto': re.compile(r'^Departamento\s+(\d+)$', re.I),
    'estac': re.compile(r'^Estacionamiento\s+(\d+)$', re.I),
    'bod':   re.compile(r'^Bodega\s+(\d+)$', re.I),
}

SCOPES = ['https://www.googleapis.com/auth/drive']

# ── CSV helpers ────────────────────────────────────────────────────────────────

def load_csv(path):
    m = {}
    with open(path, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            m[(row['tipo'], row['numero'])] = row['folder_id']
    return m

def save_csv(path, data):
    order = {'depto': 0, 'estac': 1, 'bod': 2}
    rows = sorted(data.items(), key=lambda x: (order.get(x[0][0], 9), int(x[0][1])))
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['tipo', 'numero', 'folder_id'])
        w.writeheader()
        for (tipo, num), fid in rows:
            w.writerow({'tipo': tipo, 'numero': num, 'folder_id': fid})

# ── Drive helpers ──────────────────────────────────────────────────────────────

SD_GET    = dict(supportsAllDrives=True)
SD_LIST   = dict(supportsAllDrives=True, includeItemsFromAllDrives=True)
SD_CREATE = dict(supportsAllDrives=True)

def check_folder_access(service, folder_id):
    service.files().get(fileId=folder_id, fields='id,name', **SD_GET).execute()

def list_drive_files(service, folder_id):
    check_folder_access(service, folder_id)
    names = set()
    token = None
    while True:
        resp = service.files().list(
            q=f"'{folder_id}' in parents and trashed=false",
            fields='nextPageToken, files(name)',
            pageToken=token,
            **SD_LIST
        ).execute()
        names.update(f['name'] for f in resp.get('files', []))
        token = resp.get('nextPageToken')
        if not token:
            break
    return names

def get_parent_id(service, folder_id):
    f = service.files().get(fileId=folder_id, fields='parents', **SD_GET).execute()
    return f['parents'][0]

def create_drive_folder(service, name, parent_id):
    meta = {
        'name': name,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [parent_id],
    }
    f = service.files().create(body=meta, fields='id', **SD_CREATE).execute()
    return f['id']

def upload_file(service, local_path, folder_id):
    meta = {'name': local_path.name, 'parents': [folder_id]}
    media = MediaFileUpload(str(local_path), mimetype='application/pdf')
    service.files().create(body=meta, media_body=media, fields='id', **SD_CREATE).execute()

# ── Lógica principal ───────────────────────────────────────────────────────────

def collect_local_folders(source_dirs):
    """
    Escanea todas las carpetas fuente y devuelve:
      { (tipo, numero, folder_name): {filename: Path} }
    Cuando hay duplicados de nombre de archivo, gana la carpeta más reciente
    (más a la derecha en la lista de source_dirs).
    """
    result = {}
    for src in source_dirs:
        if not src.exists():
            print(f"  [WARN] No existe: {src}")
            continue
        for subdir in sorted(src.iterdir()):
            if not subdir.is_dir():
                continue
            tipo = num = folder_name = None
            for t, pat in FOLDER_PATTERNS.items():
                m = pat.match(subdir.name)
                if m:
                    tipo, num, folder_name = t, m.group(1), subdir.name
                    break
            if tipo is None:
                continue
            key = (tipo, num, folder_name)
            if key not in result:
                result[key] = {}
            for pdf in subdir.glob('*.pdf'):
                result[key][pdf.name] = pdf  # versión más reciente gana
    return result

def sync_building(service, building, source_dirs, csv_map):
    local = collect_local_folders(source_dirs)
    if not local:
        print(f"  Sin carpetas locales encontradas.")
        return

    # Cache de padres por tipo para crear carpetas nuevas bajo el mismo padre
    parents = {}

    def get_tipo_parent(tipo):
        if tipo not in parents:
            existing_id = next((csv_map[k] for k in csv_map if k[0] == tipo), None)
            if not existing_id:
                print(f"  [WARN] Sin referencia de padre para tipo '{tipo}' — no se pueden crear carpetas nuevas de este tipo")
                parents[tipo] = None
            else:
                parents[tipo] = get_parent_id(service, existing_id)
        return parents[tipo]

    csv_changed = False

    for (tipo, num, folder_name), files in sorted(local.items(), key=lambda x: (x[0][0], int(x[0][1]))):
        if not files:
            continue

        key = (tipo, num)
        folder_id = csv_map.get(key)

        if folder_id:
            try:
                existing_in_drive = list_drive_files(service, folder_id)
            except Exception as e:
                print(f"  {folder_name}: [ERROR acceso] {e}")
                print(f"    → Asegúrate de compartir la carpeta padre con:")
                print(f"      update-contratos-estructurados@visor-de-rent-roll-situ.iam.gserviceaccount.com (Editor)")
                continue
            to_upload = {name: path for name, path in files.items() if name not in existing_in_drive}
            if to_upload:
                print(f"  {folder_name}: subiendo {len(to_upload)} archivo(s)...")
                for name, path in sorted(to_upload.items()):
                    upload_file(service, path, folder_id)
                    print(f"    ✓ {name}")
            else:
                print(f"  {folder_name}: al día ({len(files)} archivo(s))")
        else:
            parent_id = get_tipo_parent(tipo)
            if parent_id is None:
                continue
            print(f"  {folder_name}: NUEVA carpeta → creando en Drive...")
            new_id = create_drive_folder(service, folder_name, parent_id)
            csv_map[key] = new_id
            csv_changed = True
            print(f"    folder_id: {new_id}")
            for name, path in sorted(files.items()):
                upload_file(service, path, new_id)
                print(f"    ✓ {name}")

    return csv_changed

def main():
    creds = service_account.Credentials.from_service_account_file(str(CREDS_JSON), scopes=SCOPES)
    service = build('drive', 'v3', credentials=creds)

    for building, source_dirs in SOURCES.items():
        print(f"\n{'='*50}")
        print(f"  {building.upper()}")
        print(f"{'='*50}")

        csv_path = CSV_FILES[building]
        csv_map = load_csv(csv_path)
        changed = sync_building(service, building, source_dirs, csv_map)

        if changed:
            save_csv(csv_path, csv_map)
            print(f"\n  → CSV actualizado: {csv_path.name}")

    print("\n✓ Listo.")

if __name__ == '__main__':
    main()
