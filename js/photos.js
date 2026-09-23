/* ---------------------------------------------------------------------------
 * js/photos.js — GENERATED FILE, do not hand-edit.
 *
 * window.PHOTOS: one entry per photograph, each with a responsive WebP set, a
 * JPEG fallback set, real pixel dimensions and an inline blur-up placeholder.
 * Paths are relative to the site root.
 *
 *   { slug, alt, caption, width, height, aspect,
 *     src,        // 800w WebP (or the largest available width below that)
 *     srcset,     // "url 400w, url 800w, url 1600w" — WebP
 *     srcsetJpg,  // the same widths as JPEG, for browsers without WebP
 *     fallback,   // the src width as JPEG
 *     lqip }      // ~20px blurred WebP data URI, under 1 KB
 *
 * Derivatives live in images/optimized/. Widths 400 / 800 / 1600, never above
 * the source's native width. WebP ~q80 and JPEG ~q82, stepped down per file
 * only where needed to stay under the 400 KB budget. All EXIF stripped.
 *
 * Sources (originals in images/ are inputs only and are never modified):
 *   petronas-towers     <- images/1 (5).JPEG     6048x8064
 *   merdeka-118         <- images/IMG_9854.JPG   1242x2208
 *   above-the-clouds    <- images/1 (4).JPEG     3024x4032
 *   mount-jerai-sky     <- images/1 (3).JPEG     1536x2048
 *   feast-concert       <- images/1 (1).JPEG     1179x2096
 *   baskara-on-the-mic  <- images/IMG_9436.JPG   2033x3471
 *   diki-renada-solo    <- images/IMG_9332.JPG   2160x3840
 *   tapir-crossing      <- images/1 (2).JPEG     2160x3840
 *   post-presentation   <- images/DSC04911.JPG   4000x6000
 *   convocation-steps   <- images/DSC04903.JPG   4000x6000
 *   amers-smile         <- images/DSC04938.JPG   4000x6000
 *   about               <- images/about.JPEG     1024x1024
 *
 * Regenerate with:  node images/optimized/build.mjs
 * Alt text and captions are hand-written in the PHOTOS table at the top of
 * that script — edit them there, not here.
 * ------------------------------------------------------------------------- */

(function (root) {
  'use strict';

  root.PHOTOS = [
    {
      slug: "petronas-towers",
      alt: "The Petronas Twin Towers at night, photographed from street level so the two towers lean toward each other and meet at the lit sky bridge.",
      caption: "Kuala Lumpur, 2025. Straight up from the base of the towers.",
      width: 800,
      height: 1066,
      aspect: 0.7505,
      src: "images/optimized/petronas-towers-800.webp",
      srcset: "images/optimized/petronas-towers-400.webp 400w, images/optimized/petronas-towers-800.webp 800w, images/optimized/petronas-towers-1600.webp 1600w",
      srcsetJpg: "images/optimized/petronas-towers-400.jpg 400w, images/optimized/petronas-towers-800.jpg 800w, images/optimized/petronas-towers-1600.jpg 1600w",
      fallback: "images/optimized/petronas-towers-800.jpg",
      lqip: "data:image/webp;base64,UklGRnQCAABXRUJQVlA4WAoAAAAwAAAAEwAAGQAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIIQAAAAEXIBBI/FnbYY2IiAUzbdukzEYiZVbY+yP6H1UX4F5WHQBWUDggXAAAANAEAJ0BKhQAGgA+qUaZSaYkIiEwDADAFQlpANAYIeH2Jn+23+yHWWBxv5rnuTKAAP76YaPSaJJMPV1f0pI3TfkrpewyZBkw1bbdW9BwzJYurQw1REfDmbuiWtAA"
    },
    {
      slug: "merdeka-118",
      alt: "Merdeka 118 rising into a grey, clouded sky behind the older shophouses of downtown Kuala Lumpur, with a 7-Eleven sign and a guesthouse facade in the foreground.",
      caption: "Merdeka 118, 2024. Seen over the shophouses below it.",
      width: 800,
      height: 1422,
      aspect: 0.5626,
      src: "images/optimized/merdeka-118-800.webp",
      srcset: "images/optimized/merdeka-118-400.webp 400w, images/optimized/merdeka-118-800.webp 800w",
      srcsetJpg: "images/optimized/merdeka-118-400.jpg 400w, images/optimized/merdeka-118-800.jpg 800w",
      fallback: "images/optimized/merdeka-118-800.jpg",
      lqip: "data:image/webp;base64,UklGRp4CAABXRUJQVlA4WAoAAAAwAAAAEwAAIgAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIIQAAAAEXIBBI/FnbYY2IiAUzbdukzEYiZVbauyP6H1UX4P6rOgBWUDgghgAAALAFAJ0BKhQAIwA+rUacSaYjoqEqrfjAFYllAMDcFF+zMLPBJq08CDZoi9hdRkkNtAG0ML4IIAD+6dz+Wwwvuuxey6ST9+qDW74P6XiNmB3kblBEJo7YL0HEU3D2iPeLG2eLTfwSu4RYOw9EJLAH87WYyR0jjm9cw1+KJ5HnYq5CR9O6AAAA"
    },
    {
      slug: "above-the-clouds",
      alt: "A person in a dark jacket sitting alone on a flat rock at first light, looking out over a valley filled with low cloud, a pine branch framing the left of the frame.",
      caption: "Sunrise above the cloud line, 2024.",
      width: 800,
      height: 1066,
      aspect: 0.7505,
      src: "images/optimized/above-the-clouds-800.webp",
      srcset: "images/optimized/above-the-clouds-400.webp 400w, images/optimized/above-the-clouds-800.webp 800w, images/optimized/above-the-clouds-1600.webp 1600w",
      srcsetJpg: "images/optimized/above-the-clouds-400.jpg 400w, images/optimized/above-the-clouds-800.jpg 800w, images/optimized/above-the-clouds-1600.jpg 1600w",
      fallback: "images/optimized/above-the-clouds-800.jpg",
      lqip: "data:image/webp;base64,UklGRpwCAABXRUJQVlA4WAoAAAAwAAAAEwAAGQAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIIQAAAAEXIBBI/FnbYY2IiAUzbdukzEYiZVbY+yP6H1UX4F5WHQBWUDgghAAAANAEAJ0BKhQAGgA+oUCZSaYjoqE3+qgAwBQJYwC7ACP7nfqVq5U20haRRFNumxEIAP7sW73ZgmA3DL1t/YQDl9FmaQkZfMysF3ZXsb00+/MejJyvDi4uhbypnCJ+Lrnhdrg0Su33PkNFnX4Esl7Bv3SYIpcFys4OL9y1zLUjxqBonAAAAA=="
    },
    {
      slug: "mount-jerai-sky",
      alt: "A night sky dense with stars above Mount Jerai, faint cloud drifting through the middle of the frame and tree canopies silhouetted in two corners.",
      caption: "Mount Jerai, 2024. Far enough from the city to see this.",
      width: 800,
      height: 1066,
      aspect: 0.7505,
      src: "images/optimized/mount-jerai-sky-800.webp",
      srcset: "images/optimized/mount-jerai-sky-400.webp 400w, images/optimized/mount-jerai-sky-800.webp 800w",
      srcsetJpg: "images/optimized/mount-jerai-sky-400.jpg 400w, images/optimized/mount-jerai-sky-800.jpg 800w",
      fallback: "images/optimized/mount-jerai-sky-800.jpg",
      lqip: "data:image/webp;base64,UklGRmICAABXRUJQVlA4WAoAAAAwAAAAEwAAGQAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIIQAAAAEXIBBI/FnbYY2IiAUzbdukzEYiZVbY+yP6H1UX4F5WHQBWUDggSgAAALAEAJ0BKhQAGgA+sUyhS6ckIy8oCqngFglnALsAERzR9n8ptQ3TOUEtJETyqAAA/vm9nDALFxySe/dJ1cOK3yhZ2C7MSKwBTAAA"
    },
    {
      slug: "feast-concert",
      alt: "Four frames from a .Feast concert arranged in a grid: the bassist and vocalist side by side, the vocalist alone at the mic, and the guitarist mid-solo, all under deep red stage light.",
      caption: ".Feast, 2023. Four frames from the same red-lit set.",
      width: 800,
      height: 1422,
      aspect: 0.5626,
      src: "images/optimized/feast-concert-800.webp",
      srcset: "images/optimized/feast-concert-400.webp 400w, images/optimized/feast-concert-800.webp 800w",
      srcsetJpg: "images/optimized/feast-concert-400.jpg 400w, images/optimized/feast-concert-800.jpg 800w",
      fallback: "images/optimized/feast-concert-800.jpg",
      lqip: "data:image/webp;base64,UklGRooCAABXRUJQVlA4WAoAAAAwAAAAEwAAIgAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIIQAAAAEXIBBI/FnbYY2IiAUzbdukzEYiZVbauyP6H1UX4P6rOgBWUDggcgAAABAEAJ0BKhQAIwA+sUqfSyckIqGqqgDgFgllAMjLvkLu38ogc0VMzcoAAP700i6VnlSEFd1QoaedBYdTmKxZQhi4dsqu0qZp6SAqJWA2UdlkDfXHOLlnP2fVYyZw4mLFC4pb7dFuxEQaKwsMb2h1LNQAAA=="
    },
    {
      slug: "baskara-on-the-mic",
      alt: "Baskara Putra singing into a handheld microphone with his head tipped back, lit through green and amber haze, a keyboardist and the silhouetted crowd around him.",
      caption: "Baskara on the mic, 2023.",
      width: 800,
      height: 1366,
      aspect: 0.5857,
      src: "images/optimized/baskara-on-the-mic-800.webp",
      srcset: "images/optimized/baskara-on-the-mic-400.webp 400w, images/optimized/baskara-on-the-mic-800.webp 800w, images/optimized/baskara-on-the-mic-1600.webp 1600w",
      srcsetJpg: "images/optimized/baskara-on-the-mic-400.jpg 400w, images/optimized/baskara-on-the-mic-800.jpg 800w, images/optimized/baskara-on-the-mic-1600.jpg 1600w",
      fallback: "images/optimized/baskara-on-the-mic-800.jpg",
      lqip: "data:image/webp;base64,UklGRlwCAABXRUJQVlA4WAoAAAAwAAAAEwAAIQAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIIQAAAAEXIBBI/FnbYY2IiAUzbdukzEYiZVbauyP6H1UX4F6rOgBWUDggRAAAANADAJ0BKhQAIgA+sVChS6ckoyGqqADgFglpAMwcHauyc8t1xGmOAAD+9eNGt1hIASFxKrEuyGs0ZBwOx905pCqv4AAA"
    },
    {
      slug: "diki-renada-solo",
      alt: "A guitarist leaning back mid-solo with a cream electric guitar raised, red stage lights burning through the smoke behind him and a bassist playing to his right.",
      caption: "Diki Renada's solo, 2023.",
      width: 800,
      height: 1422,
      aspect: 0.5626,
      src: "images/optimized/diki-renada-solo-800.webp",
      srcset: "images/optimized/diki-renada-solo-400.webp 400w, images/optimized/diki-renada-solo-800.webp 800w, images/optimized/diki-renada-solo-1600.webp 1600w",
      srcsetJpg: "images/optimized/diki-renada-solo-400.jpg 400w, images/optimized/diki-renada-solo-800.jpg 800w, images/optimized/diki-renada-solo-1600.jpg 1600w",
      fallback: "images/optimized/diki-renada-solo-800.jpg",
      lqip: "data:image/webp;base64,UklGRngCAABXRUJQVlA4WAoAAAAwAAAAEwAAIgAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIIQAAAAEXIBBI/FnbYY2IiAUzbdukzEYiZVbauyP6H1UX4P6rOgBWUDggYAAAALADAJ0BKhQAIwA+sU6fSyckIqGqqgDgFgllAL/sHrV4hnUGePrQAP70xMCx/cCZ+wv1eL2Qlv6YKOCAlVd85zb8P+iOh66leslwdAfsBjVlVVRNuIwUtKSPK14Fzm8AAA=="
    },
    {
      slug: "tapir-crossing",
      alt: "A life-size Malayan tapir model standing beside a yellow diamond road sign reading AWAS TAPIR MELINTAS, at the entrance to the Pasar Besar market hall.",
      caption: "Pasar Besar, 2024. The warning and its subject, in one frame.",
      width: 800,
      height: 1422,
      aspect: 0.5626,
      src: "images/optimized/tapir-crossing-800.webp",
      srcset: "images/optimized/tapir-crossing-400.webp 400w, images/optimized/tapir-crossing-800.webp 800w, images/optimized/tapir-crossing-1600.webp 1600w",
      srcsetJpg: "images/optimized/tapir-crossing-400.jpg 400w, images/optimized/tapir-crossing-800.jpg 800w, images/optimized/tapir-crossing-1600.jpg 1600w",
      fallback: "images/optimized/tapir-crossing-800.jpg",
      lqip: "data:image/webp;base64,UklGRtwCAABXRUJQVlA4WAoAAAAwAAAAEwAAIgAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIIQAAAAEXIBBI/FnbYY2IiAUzbdukzEYiZVbauyP6H1UX4P6rOgBWUDggxAAAABAHAJ0BKhQAIwA+pUCdSaYjoyEwGq1QwBSJZACdOUFSHAAAJrEF38DRwGBj8BGIBliVTBWd/kXuqR75ipbAhFBAAP7geY1ilTFoSgYbia6WSkakQFkFNqaTk5n/G0yPaNTF1x32S92/5D4of38sYApB5MD9p+A2lOPaAQ+4ykSndpNxn9/JwnkpEewCA+HkwMEWB2mtVsWZ8WLdSP4A69yjNKcABmbQBpm8FuMe7eqb6qJg2+TmMFcccF1cI/INxg1NgAA="
    },
    {
      slug: "post-presentation",
      alt: "Six students in shirts and ties collapsed across outdoor steps immediately after a presentation, one leaning back with his eyes closed, another still holding his tie.",
      caption: "The minute the presentation ended, 2026.",
      width: 800,
      height: 1200,
      aspect: 0.6667,
      src: "images/optimized/post-presentation-800.webp",
      srcset: "images/optimized/post-presentation-400.webp 400w, images/optimized/post-presentation-800.webp 800w, images/optimized/post-presentation-1600.webp 1600w",
      srcsetJpg: "images/optimized/post-presentation-400.jpg 400w, images/optimized/post-presentation-800.jpg 800w, images/optimized/post-presentation-1600.jpg 1600w",
      fallback: "images/optimized/post-presentation-800.jpg",
      lqip: "data:image/webp;base64,UklGRqICAABXRUJQVlA4WAoAAAAwAAAAEwAAHQAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIIQAAAAEXIBBI/FnbYY2IiAUzbdukzEYiZVbauyP6H1UX4N6oOgBWUDggigAAABAFAJ0BKhQAHgA+sU6gS6ckIyGoCqjgFgllAL84CxOeqwWgKwDE0Ja0vr2RQz96TgAA/unql4AV/ZjGVDUSxT88q73N/rvLzjh8Bf/ZuQaI4jMDo+oMruTFQoWywA7lrx3Mm9MTtOF13prDNLNlEjFPK11LrxmMRvCW1nzZzaV887Ug6yYOHzAAAA=="
    },
    {
      slug: "convocation-steps",
      alt: "A dozen students in black suits sprawled down a campus staircase in the afternoon light, one of them giving a thumbs-up to the camera.",
      caption: "Twelve suits, one staircase, 2026.",
      width: 800,
      height: 1200,
      aspect: 0.6667,
      src: "images/optimized/convocation-steps-800.webp",
      srcset: "images/optimized/convocation-steps-400.webp 400w, images/optimized/convocation-steps-800.webp 800w, images/optimized/convocation-steps-1600.webp 1600w",
      srcsetJpg: "images/optimized/convocation-steps-400.jpg 400w, images/optimized/convocation-steps-800.jpg 800w, images/optimized/convocation-steps-1600.jpg 1600w",
      fallback: "images/optimized/convocation-steps-800.jpg",
      lqip: "data:image/webp;base64,UklGRqACAABXRUJQVlA4WAoAAAAwAAAAEwAAHQAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIIQAAAAEXIBBI/FnbYY2IiAUzbdukzEYiZVbauyP6H1UX4N6oOgBWUDggiAAAADAFAJ0BKhQAHgA+sUqgSyckIyGwGAgA4BYJZwCw7DBm9UKwKqSgYAS87dXR3NNCaxnAALmGct7QARtmR9PdMike34J1R574LkIi6CJmmenrSWLgZRVQFr27j6ZX8SxnN6jGkRwKMu2eyRJL7t7/66jxVF892588dkn0L3VyodpS0g/LWwKAAAA="
    },
    {
      slug: "amers-smile",
      alt: "A student in a white shirt and black tie grinning at the camera on a campus staircase, a bag strap over one shoulder and classmates out of focus behind him.",
      caption: "Amer, 2026.",
      width: 800,
      height: 1200,
      aspect: 0.6667,
      src: "images/optimized/amers-smile-800.webp",
      srcset: "images/optimized/amers-smile-400.webp 400w, images/optimized/amers-smile-800.webp 800w, images/optimized/amers-smile-1600.webp 1600w",
      srcsetJpg: "images/optimized/amers-smile-400.jpg 400w, images/optimized/amers-smile-800.jpg 800w, images/optimized/amers-smile-1600.jpg 1600w",
      fallback: "images/optimized/amers-smile-800.jpg",
      lqip: "data:image/webp;base64,UklGRqQCAABXRUJQVlA4WAoAAAAwAAAAEwAAHQAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIIQAAAAEXIBBI/FnbYY2IiAUzbdukzEYiZVbauyP6H1UX4N6oOgBWUDggjAAAAHAFAJ0BKhQAHgA+sU6hS6ckIyGoCqjgFgljALDsMGmC6A7QxHCUWLmXjaWi+VQUuTT9weAA/oEMgmPWDaOnfNg4fsbEcXpTao2kZDr7eLcnW9KvTYG+npsXqsd2i01YJ+S/50m+ReRGs0/IcxtmMY3wHiWtbD3uy+sKOa/edWx5s8RcMAv2smqNAAAA"
    },
    {
      slug: "about",
      alt: "Portrait of Aidil Azani in a black suit and open-collar shirt against a deep red backdrop, lit from the left.",
      caption: "Portrait, 2026.",
      width: 800,
      height: 800,
      aspect: 1,
      src: "images/optimized/about-800.webp",
      srcset: "images/optimized/about-400.webp 400w, images/optimized/about-800.webp 800w",
      srcsetJpg: "images/optimized/about-400.jpg 400w, images/optimized/about-800.jpg 800w",
      fallback: "images/optimized/about-800.jpg",
      lqip: "data:image/webp;base64,UklGRnwCAABXRUJQVlA4WAoAAAAwAAAAEwAAEwAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIIgAAAAEXIBBI/FnbYY2IiAWDbCPtzF5iZ3bWDxDR/6i6APe06gBWUDggZAAAALADAJ0BKhQAFAA+sU6iS6ckIyGoCqjgFglmAJ0AERzF9cbMhayAAP71dTV8uVYH9LuiZKhL9qfacMG594gZwQnX58qL1N4IoZLEj6EdIj9ykWEzYEUgaIpXNwJOc8vK718AAAA="
    }
  ];
}(window));
