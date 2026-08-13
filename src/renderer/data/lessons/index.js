import jsLessons from './javascript.json';
import pyLessons from './python.json';
import tsLessons from './typescript.json';
import rtLessons from './react.json';

export default {
  schemaVersion: 2,
  tracks: [
    ...jsLessons.tracks,
    ...pyLessons.tracks,
    ...tsLessons.tracks,
    ...rtLessons.tracks
  ]
};
