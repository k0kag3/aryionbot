import fetch from 'node-fetch';
import {JSDOM} from 'jsdom';
import parse from 'date-fns/parse';
import formatISO from 'date-fns/formatISO';

export interface Update {
  itemID: string;
  title: string;
  created: string;
  author: string;
  authorURL: string;
  tags: string[];
  shortDescription: string;
  detailURL: string;
  thumbnailURL: string;
}

export interface Item {
  ogpImageURL: string;
  imageURL: string;
  authorAvatarURL: string;
}

async function getDOM(endpoint: string) {
  const {
    window: {document},
  } = new JSDOM(await fetch(endpoint).then((res) => res.text()));
  return document;
}

export async function userExists(username: string) {
  const res = await fetch(`https://aryion.com/g4/user/${username}`, {
    method: 'HEAD',
  });
  return res.ok;
}

export async function getItemDetail(itemID: string): Promise<Item> {
  const itemEndpoint = `https://aryion.com/g4/view/${itemID}`;
  const document = await getDOM(itemEndpoint);

  const ogpImageURL = document
    .querySelector('meta[name="twitter:image"]')!
    .getAttribute('content')!;

  const imageURL = document
    .querySelector('meta[property="og:image:secure_url"]')!
    .getAttribute('content')!;

  const authorAvatarURL =
    'https:' + document.querySelector('.avatar')!.getAttribute('src')!;

  return {
    ogpImageURL,
    imageURL,
    authorAvatarURL,
  };
}

export async function getLatestUpdates(username: string): Promise<Update[]> {
  const latestUpdatesEndpoint = `https://aryion.com/g4/latest.php?name=${username}`;

  const document = await getDOM(latestUpdatesEndpoint);
  const latestUpdates = Array.from(
    document.querySelectorAll('.detail-item'),
  ).map((element) => ({
    itemID: element
      .querySelector('.iteminfo a')!
      .getAttribute('href')!
      .replace('/g4/view/', ''),
    title: element.querySelector('.iteminfo a')!.textContent!,
    created: formatISO(
      parse(
        element.querySelector('.pretty-date')!.getAttribute('title')!,
        'MMM do, yyyy hh:mm aa',
        new Date(),
      ),
    ),
    author: element.querySelector('.user-link')!.textContent!,
    authorURL: `https://aryion.com${element
      .querySelector('.user-link')!
      .getAttribute('href')}`,
    tags: Array.from(element.querySelectorAll('.taglist > a')).map(
      (link) => link.textContent!,
    ),
    shortDescription: element.querySelector('.iteminfo > p:nth-last-child(1)')!
      .textContent!,
    detailURL:
      'https://aryion.com' +
      element.querySelector('.iteminfo a')!.getAttribute('href'),
    thumbnailURL:
      'https:' + element.querySelector('.thumb > img')!.getAttribute('src')!,
  }));
  return latestUpdates;
}
