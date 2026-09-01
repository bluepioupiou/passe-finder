import * as migration_20260825_205959_init from './20260825_205959_init';
import * as migration_20260826_104122_danse from './20260826_104122_danse';
import * as migration_20260826_104359_position from './20260826_104359_position';
import * as migration_20260826_104503_position_legacy_id from './20260826_104503_position_legacy_id';
import * as migration_20260827_200955_passe from './20260827_200955_passe';
import * as migration_20260830_072052_enchainement from './20260830_072052_enchainement';
import * as migration_20260830_202812_drapeau_admin from './20260830_202812_drapeau_admin';
import * as migration_20260831_165326_favoris from './20260831_165326_favoris';
import * as migration_20260831_195957_musique_enchainement from './20260831_195957_musique_enchainement';
import * as migration_20260901_042354_titre_normalise from './20260901_042354_titre_normalise';
import * as migration_20260901_075115_transition from './20260901_075115_transition';
import * as migration_20260901_155620_pseudo from './20260901_155620_pseudo';
import * as migration_20260901_200844_identifiant_public_et_visibilites from './20260901_200844_identifiant_public_et_visibilites';

export const migrations = [
  {
    up: migration_20260825_205959_init.up,
    down: migration_20260825_205959_init.down,
    name: '20260825_205959_init',
  },
  {
    up: migration_20260826_104122_danse.up,
    down: migration_20260826_104122_danse.down,
    name: '20260826_104122_danse',
  },
  {
    up: migration_20260826_104359_position.up,
    down: migration_20260826_104359_position.down,
    name: '20260826_104359_position',
  },
  {
    up: migration_20260826_104503_position_legacy_id.up,
    down: migration_20260826_104503_position_legacy_id.down,
    name: '20260826_104503_position_legacy_id',
  },
  {
    up: migration_20260827_200955_passe.up,
    down: migration_20260827_200955_passe.down,
    name: '20260827_200955_passe',
  },
  {
    up: migration_20260830_072052_enchainement.up,
    down: migration_20260830_072052_enchainement.down,
    name: '20260830_072052_enchainement',
  },
  {
    up: migration_20260830_202812_drapeau_admin.up,
    down: migration_20260830_202812_drapeau_admin.down,
    name: '20260830_202812_drapeau_admin',
  },
  {
    up: migration_20260831_165326_favoris.up,
    down: migration_20260831_165326_favoris.down,
    name: '20260831_165326_favoris',
  },
  {
    up: migration_20260831_195957_musique_enchainement.up,
    down: migration_20260831_195957_musique_enchainement.down,
    name: '20260831_195957_musique_enchainement',
  },
  {
    up: migration_20260901_042354_titre_normalise.up,
    down: migration_20260901_042354_titre_normalise.down,
    name: '20260901_042354_titre_normalise',
  },
  {
    up: migration_20260901_075115_transition.up,
    down: migration_20260901_075115_transition.down,
    name: '20260901_075115_transition',
  },
  {
    up: migration_20260901_155620_pseudo.up,
    down: migration_20260901_155620_pseudo.down,
    name: '20260901_155620_pseudo',
  },
  {
    up: migration_20260901_200844_identifiant_public_et_visibilites.up,
    down: migration_20260901_200844_identifiant_public_et_visibilites.down,
    name: '20260901_200844_identifiant_public_et_visibilites'
  },
];
