import * as aryion from './aryion';

it('can fetch story', async () => {
  const item = await aryion.getItemDetail('594831');
  console.log(item);
});
