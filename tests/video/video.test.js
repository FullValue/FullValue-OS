import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addTimeNote, formatTime, progressPatch, resumePoint, thumbnailOf, videoSource, watchPercent } from '../../src/lib/video.js'

test('détection de la source : YouTube quel que soit le type, Vimeo, lien direct, fichier importé', () => {
  assert.equal(videoSource({ type: 'video', url: 'https://youtu.be/dQw4w9WgXcQ' }).kind, 'youtube')
  assert.equal(videoSource({ type: 'youtube', youtubeId: 'dQw4w9WgXcQ' }).youtubeId, 'dQw4w9WgXcQ')
  assert.equal(videoSource({ type: 'article', url: 'https://youtu.be/dQw4w9WgXcQ' }), null)
  const vimeo = videoSource({ type: 'video', url: 'https://vimeo.com/76979871/abc123def' })
  assert.deepEqual([vimeo.kind, vimeo.vimeoId, vimeo.hash], ['vimeo', '76979871', 'abc123def'])
  assert.deepEqual(videoSource({ url: 'https://cdn.exemple.fr/cours.mp4?x=1' }), { kind: 'direct', media: 'video', url: 'https://cdn.exemple.fr/cours.mp4?x=1' })
  assert.equal(videoSource({ url: 'https://exemple.fr/ep1.mp3' }).media, 'audio')
  assert.equal(videoSource({ type: 'fichier', filePath: 'u/a.mp4', fileMimeType: 'video/mp4' }).kind, 'file')
  assert.equal(videoSource({ type: 'fichier', filePath: 'u/a.pdf', fileMimeType: 'application/pdf' }), null)
  assert.equal(videoSource({ type: 'livre', url: 'https://exemple.fr/livre' }), null)
})

test('miniature YouTube déduite du lien', () => {
  assert.equal(thumbnailOf({ type: 'video', url: 'https://youtu.be/dQw4w9WgXcQ' }), 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  assert.equal(thumbnailOf({ type: 'fichier', filePath: 'a.mp4', fileMimeType: 'video/mp4' }), null)
})

test('formats et progression', () => {
  assert.equal(formatTime(75), '1:15')
  assert.equal(formatTime(3725), '1:02:05')
  assert.equal(watchPercent({ watchTime: 50, watchDuration: 200 }), 25)
  assert.equal(resumePoint({ watchTime: 120, watchDuration: 600 }), 117)
  assert.equal(resumePoint({ watchTime: 4, watchDuration: 600 }), 0)
  assert.equal(resumePoint({ watchTime: 590, watchDuration: 600 }), 0)
})

test('le statut avance avec la lecture sans jamais reculer', () => {
  assert.equal(progressPatch({ status: 'a_voir' }, 30, 600).status, 'en_cours')
  assert.equal(progressPatch({ status: 'a_voir' }, 2, 600).status, undefined)
  assert.equal(progressPatch({ status: 'en_cours' }, 560, 600).status, 'done')
  assert.equal(progressPatch({ status: 'done' }, 30, 600).status, undefined)
})

test('notes horodatées triées, vides ignorées', () => {
  const n1 = addTimeNote([], 90, ' idée clé ', 'a')
  const n2 = addTimeNote(n1, 10, 'intro', 'b')
  assert.deepEqual(n2.map(n => n.id), ['b', 'a'])
  assert.equal(addTimeNote(n2, 5, '   ', 'c'), n2)
})
