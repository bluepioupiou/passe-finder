import * as migration_20260825_205959_init from './20260825_205959_init';
import * as migration_20260826_104122_danse from './20260826_104122_danse';
import * as migration_20260826_104359_position from './20260826_104359_position';
import * as migration_20260826_104503_position_legacy_id from './20260826_104503_position_legacy_id';

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
    name: '20260826_104503_position_legacy_id'
  },
];
