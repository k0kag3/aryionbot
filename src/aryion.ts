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

export interface IItem {
  authorAvatarURL: string;
}

export interface ImageItem extends IItem {
  ogpImageURL: string;
  imageURL: string;
  type: 'image';
}

export interface StoryItem extends IItem {
  type: 'story';
}

export type Item = ImageItem | StoryItem;

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

  const itemTag = document.querySelector('#item-itself')!.tagName;

  const authorAvatarURL = document.querySelector<HTMLImageElement>('.avatar')!
    .src;

  switch (itemTag) {
    case 'IMG': {
      const ogpImageURL = document.querySelector<HTMLMetaElement>(
        'meta[name="twitter:image"]',
      )!.content;

      const imageURL = document.querySelector<HTMLMetaElement>(
        'meta[property="og:image:secure_url"]',
      )!.content;

      return {
        ogpImageURL,
        imageURL,
        authorAvatarURL,
        type: 'image',
      } as ImageItem;
    }
    case 'IFRAME': {
      return {
        authorAvatarURL,
        type: 'story',
      } as StoryItem;
    }
    default: {
      throw new Error('Invalid item type found');
    }
  }
}

export async function getLatestUpdates(username: string): Promise<Update[]> {
  const latestUpdatesEndpoint = `https://aryion.com/g4/latest.php?name=${username}`;

  const document = await getDOM(latestUpdatesEndpoint);
  const latestUpdates = Array.from(
    document.querySelectorAll('.detail-item'),
  ).map((element) => ({
    itemID: element
      .querySelector<HTMLAnchorElement>('.iteminfo a')!
      .href.replace('https://aryion.com/g4/view/', ''),
    title: element.querySelector('.iteminfo a')!.textContent!,
    created: formatISO(
      parse(
        element.querySelector('.pretty-date')!.getAttribute('title')!,
        'MMM do, yyyy hh:mm aa',
        new Date(),
      ),
    ),
    author: element.querySelector('.user-link')!.textContent!,
    authorURL: element.querySelector<HTMLAnchorElement>('.user-link')!.href,
    tags: Array.from(element.querySelectorAll('.taglist > a')).map(
      (link) => link.textContent!,
    ),
    shortDescription: element.querySelector('.iteminfo > p:nth-last-child(1)')!
      .textContent!,
    detailURL: element.querySelector<HTMLAnchorElement>('.iteminfo a')!.href,
    thumbnailURL: element.querySelector<HTMLImageElement>('.thumb > img')!.src,
  }));
  return latestUpdates;
}
