import jsLessons from './javascript.json';
import pyLessons from './python.json';
import tsLessons from './typescript.json';
import rtLessons from './react.json';
import htmlLessons from './html.json';
import cssLessons from './css.json';
import tailwindLessons from './tailwind.json';
import gitLessons from './git.json';
import nodeLessons from './nodejs.json';
import mongoLessons from './mongodb.json';
import expressLessons from './express.json';
import sqlLessons from './sql.json';
import nextLessons from './nextjs.json';
import authLessons from './auth.json';
import dockerLessons from './docker.json';
import testingLessons from './testing.json';
import securityLessons from './security.json';
import performanceLessons from './performance.json';
import systemDesignLessons from './systemdesign.json';
import cicdLessons from './cicd.json';
import observabilityLessons from './observability.json';
import accessibilityLessons from './accessibility.json';
import httpLessons from './http.json';

export default {
  schemaVersion: 2,
  tracks: [
    ...jsLessons.tracks,
    ...pyLessons.tracks,
    ...tsLessons.tracks,
    ...rtLessons.tracks,
    ...htmlLessons.tracks,
    ...cssLessons.tracks,
    ...tailwindLessons.tracks,
    ...gitLessons.tracks,
    ...nodeLessons.tracks,
    ...mongoLessons.tracks,
    ...expressLessons.tracks,
    ...sqlLessons.tracks,
    ...nextLessons.tracks,
    ...authLessons.tracks,
    ...dockerLessons.tracks,
    ...testingLessons.tracks,
    ...securityLessons.tracks,
    ...performanceLessons.tracks,
    ...systemDesignLessons.tracks,
    ...cicdLessons.tracks,
    ...observabilityLessons.tracks,
    ...accessibilityLessons.tracks,
    ...httpLessons.tracks,
  ]
};
