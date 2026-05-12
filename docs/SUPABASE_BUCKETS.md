# Supabase Storage — Buckets requis

Ce fichier liste tous les buckets Storage nécessaires au Cockpit, avec leurs configurations et les policies RLS à appliquer dans le **SQL Editor** de Supabase.

---

## Création d'un bucket

Dans Supabase : **Storage → New bucket**

| Champ | Valeur |
|---|---|
| Nom | voir ci-dessous |
| Public | NON (sauf `avatars` si tu veux des URLs publiques) |
| File size limit | voir ci-dessous |
| Allowed MIME types | voir ci-dessous |

---

## Bucket 1 — `task-attachments`

Images et fichiers attachés aux cartes Trello (image cover, pièces jointes).

| Config | Valeur |
|---|---|
| Public | Non |
| File size limit | 50 MB |
| MIME types autorisés | `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/svg+xml` |

**Path pattern** : `{user_id}/{task_id}/{uuid}.{ext}`

```sql
CREATE POLICY "task-attachments: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "task-attachments: read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'task-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "task-attachments: delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'task-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "task-attachments: update own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'task-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Bucket 2 — `training-files`

Fichiers des ressources Formation (PDFs, vidéos, etc.).

| Config | Valeur |
|---|---|
| Public | Non |
| File size limit | 200 MB |
| MIME types autorisés | `image/*`, `application/pdf`, `video/mp4`, `video/webm`, `audio/mpeg`, `text/plain` |

**Path pattern** : `{user_id}/{uuid}.{ext}`

```sql
CREATE POLICY "training-files: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'training-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "training-files: read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'training-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "training-files: delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'training-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Bucket 3 — `resource-files`

Fichiers du Hub Ressources (templates, docs, prompts en PDF).

| Config | Valeur |
|---|---|
| Public | Non |
| File size limit | 50 MB |
| MIME types autorisés | `image/*`, `application/pdf`, `text/plain`, `text/csv`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |

**Path pattern** : `{user_id}/{uuid}.{ext}`

```sql
CREATE POLICY "resource-files: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resource-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "resource-files: read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'resource-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "resource-files: delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'resource-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Bucket 4 — `client-documents`

Documents clients (contrats, briefs, livrables).

| Config | Valeur |
|---|---|
| Public | Non |
| File size limit | 100 MB |
| MIME types autorisés | `image/*`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `text/plain`, `text/csv`, `application/zip` |

**Path pattern** : `{user_id}/{client_id}/{uuid}.{ext}`

```sql
CREATE POLICY "client-documents: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "client-documents: read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'client-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "client-documents: delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Vérification

Après création, vérifie dans **Storage → Buckets** que les 4 buckets apparaissent avec la bonne config.

Pour tester les policies : uploader un fichier depuis l'app en étant connecté → doit réussir. Accéder à l'URL directe sans auth → doit échouer (403).

---

## Note sur `storage.foldername(name)`

La fonction `storage.foldername(name)` retourne un tableau des segments du chemin. Pour un fichier uploadé à `abc123/task_456/file.png`, `foldername(name)[1]` = `'abc123'` = l'user_id. C'est le pattern standard utilisé dans toute l'app.
