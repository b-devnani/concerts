# concerts

A personal live-music diary, laid out like a playlist. Side A has the shows coming up and the ones I've been to, side B has every artist I've seen and the lists of who I still need to see, and "about" opens the intro, fav artists and fav concerts. The bar at the bottom plays songs through Spotify.

## Editing

Everything on the page comes from the files in [`contents/`](contents); edit one, commit, and the page picks it up. The comment at the top of each file lists its fields.

- [`concerts.yml`](contents/concerts.yml): every show. Shows dated today or later are **upcoming**; earlier ones move to **been there**. A past show's `seen_as` names the artist it counts for in `artists.yml`, and `photo` points at its picture.
- [`artists.yml`](contents/artists.yml): every artist I've seen (`(x3)` for three times) and what I remember about each performance, the need-to-see and tag-along lists, and fav artists and fav concerts.
- [`intro.yml`](contents/intro.yml): the intro, the song "Hollup" plays, my photo, and the photo credits.
- [`playlist.yml`](contents/playlist.yml): the songs the bottom player shuffles through.

The player plays Spotify's 30-second clip of each song. After adding a song with a `spotify:` link, run `python3 tools/clips.py` to fill in its clip (`preview:`); without one, tapping play opens the song on Spotify.

Words are shown exactly as typed ([docs/adr/0001](docs/adr/0001-reviews-stay-word-for-word.md)). [`CONTEXT.md`](CONTEXT.md) explains the terms.

## Pictures

- Artist photos live in `static/img/artists/`, named after the artist in lowercase with dashes: "Aminé" is `amine.jpg`, "Burna Boy" is `burna-boy.jpg`, "D’Banj" is `dbanj.jpg`. Without one, the page draws a coloured cover with the initial.
- Show pictures live in `static/img/shows/` and are set with `photo:` on the show. Your own photos from the night are the best ones to use.
- Album art for the player lives in `static/img/songs/`, named by the Spotify track id (the last part of the song's link). Without one, the player draws a coloured cover.
- Most artist photos come from Spotify and most show pictures from event pages, so they belong to the artists, promoters and photographers. The credits line at the bottom of side B says where they're from.

## Hosting

Served with GitHub Pages from the `main` branch (Settings → Pages → Deploy from a branch → `main` / root). Opening `index.html` straight from disk won't load the YAML files; run `python3 -m http.server` in this folder and open http://localhost:8000 instead.

## Credits

Inspired by the concerts page in [1Soyebo/1Soyebo.github.io](https://github.com/1Soyebo/1Soyebo.github.io), which builds on Sen Li's MIT-licensed site template.
