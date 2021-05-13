import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import parse from "date-fns/parse";
import formatISO from "date-fns/formatISO";

import { AryionUserNotFoundError } from "./errors";

export interface Update {
  itemId: string;
  title: string;
  created: string;
  author: string;
  authorURL: string;
  tags: string[];
  shortDescription: string;
  detailURL: string;
  previewUrl?: string;
  previewText?: string;
}

export interface BaseItem {
  authorAvatarURL: string;
}

export interface ImageItem extends BaseItem {
  type: "image";
  ogpImageURL: string;
  imageURL: string;
}

export interface StoryItem extends BaseItem {
  type: "story";
}

export interface OtherMaterialItem extends BaseItem {
  type: "other";
}

export type Item = ImageItem | StoryItem | OtherMaterialItem;

async function getDOM(endpoint: string) {
  const {
    window: { document },
  } = new JSDOM(await fetch(endpoint).then((res) => res.text()));
  return document;
}

export async function verifyUser(aryionUsername: string) {
  const document = await getDOM(`https://aryion.com/g4/user/${aryionUsername}`);

  if (
    document.querySelector<HTMLSpanElement>(".g-box-title")!.textContent ===
    "User Not Found"
  ) {
    throw new AryionUserNotFoundError(aryionUsername);
  }

  const username = document.querySelector<HTMLAnchorElement>(
    "#uph-namesummary a.user-link"
  )!.textContent!;
  const avatarUrl = document.querySelector<HTMLImageElement>(".avatar")!.src;

  return { username, avatarUrl };
}

export async function getItemDetail(itemId: string): Promise<Item> {
  const itemEndpoint = `https://aryion.com/g4/view/${itemId}`;
  const document = await getDOM(itemEndpoint);

  const itemTag = document.querySelector("#item-itself")!.tagName;

  const authorAvatarURL = document.querySelector<HTMLImageElement>(".avatar")!
    .src;

  switch (itemTag) {
    case "IMG": {
      // image
      const ogpImageURL = document.querySelector<HTMLMetaElement>(
        'meta[name="twitter:image"]'
      )!.content;

      const imageURL = document.querySelector<HTMLMetaElement>(
        'meta[property="og:image:secure_url"]'
      )!.content;

      return {
        type: "image",
        ogpImageURL,
        imageURL,
        authorAvatarURL,
      } as ImageItem;
    }
    case "IFRAME": {
      // text / pdf
      return {
        type: "story",
        authorAvatarURL,
      } as StoryItem;
    }
    case "DIV": {
      // flash
      return {
        type: "other",
        authorAvatarURL,
      } as OtherMaterialItem;
    }
    default: {
      throw new Error("Invalid item type found");
    }
  }
}

export async function getLatestUpdates(username: string): Promise<Update[]> {
  const latestUpdatesEndpoint = `https://aryion.com/g4/latest.php?name=${username}`;

  const document = await getDOM(latestUpdatesEndpoint);
  const latestUpdates = Array.from(
    document.querySelectorAll(".detail-item")
  ).map(
    (element): Update => {
      const update = {
        itemId: element
          .querySelector<HTMLAnchorElement>(".iteminfo a")!
          .href.replace("https://aryion.com/g4/view/", ""),
        title: element.querySelector(".iteminfo a")!.textContent!,
        created: formatISO(
          parse(
            element.querySelector(".pretty-date")!.getAttribute("title")!,
            "MMM do, yyyy hh:mm aa",
            new Date()
          )
        ),
        author: element.querySelector(".user-link")!.textContent!,
        authorURL: element.querySelector<HTMLAnchorElement>(".user-link")!.href,
        tags: Array.from(element.querySelectorAll(".taglist > a")).map(
          (link) => link.textContent!
        ),
        shortDescription: element.querySelector(
          ".iteminfo > p:nth-last-child(1)"
        )!.textContent!,
        detailURL: element.querySelector<HTMLAnchorElement>(".iteminfo a")!
          .href,
      } as Update;

      const thumbnail = element.querySelector<HTMLImageElement>(
        "a.thumb > img"
      );
      // image -> must have thumbnail
      // story -> may have thumbnail, may have preview text
      if (thumbnail) {
        update.previewUrl = thumbnail.src;
      }

      const previewElement = element.querySelector<HTMLParagraphElement>(
        "a.thumb > p"
      );
      if (previewElement) {
        update.previewText = previewElement.textContent!;
      }

      return update;
    }
  );
  return latestUpdates;
}
