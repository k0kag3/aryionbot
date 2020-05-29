import * as aryion from './aryion';
import {AryionUserNotFoundError} from './errors';

it('can fetch story', async () => {
  const item = await aryion.getItemDetail('594831');
  expect(item.type).toBe('story');
});

it('can fetch canonical username', async () => {
  const user = await aryion.getUser('KoKaGe');
  console.log(user);
  expect(user.username).toBe('kokage');
});

it('return error then fetching invalid user', async () => {
  expect(aryion.getUser('wajfowaijfwoafjaif')).rejects.toThrow(
    AryionUserNotFoundError,
  );
});
