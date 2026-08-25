import * as migration_20260825_205959_init from './20260825_205959_init';

export const migrations = [
  {
    up: migration_20260825_205959_init.up,
    down: migration_20260825_205959_init.down,
    name: '20260825_205959_init'
  },
];
