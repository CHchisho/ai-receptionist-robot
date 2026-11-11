# LLM-mallien vertailu

Vertailun tarkoitus oli löytää vastaanottorobotille parempi paikallinen kielimalli kuin nykyinen `llama3.2:1b`.

**Suositus:** `qwen3:4b-instruct-2507-q4_K_M`, lämpötila 0.2 ja yksi uusi kieltäytymissääntö järjestelmäpromptiin.

## Miten testattiin

- 7 paikallista Ollama-mallia ja 12 vastaanottokysymystä (6 englanniksi, 6 suomeksi). Jokainen kysymys ajettiin kahdesti, eli mallia kohden tuli 24 vastausta.
- Järjestelmäprompti ja RAG-promptin muoto olivat samat kuin sovelluksessa.
- Ajot tehtiin pelkällä prosessorilla (Docker, 12 ydintä, 8 GB muistia).
- Kaikki vastaukset arvosteltiin käsin. Oikea vastaus sai 1 pisteen, osittain oikea 0,5 pistettä ja väärä tai keksitty 0 pistettä.

## Tulokset

| Malli | Laatu | Vastausaika (mediaani) | Muisti | Huomio |
| --- | --- | --- | --- | --- |
| llama3.2:1b (nykyinen) | 29 % | 0,9 s | 1,7 GB | Suomi ei toimi, keksii faktoja |
| gemma3:1b | 73 % | 1,4 s | 1,1 GB | |
| qwen3:1.7b | 65 % | 1,1 s | 1,8 GB | |
| phi4-mini | 71 % | 1,9 s | 3,4 GB | |
| gemma3:4b | 75 % | 3,1 s | 2,7 GB | Paras suomi, käsittelee promptin hitaasti |
| qwen3:4b-instruct-2507 | 77 % | 2,3 s | 3,3 GB | Paras kokonaisuus |
| llama3.1:8b | 67 % | 5,6 s | 5,2 GB | Hidas eikä parempi |

Kahta parasta mallia testattiin vielä lämpötilalla 0.2 ja kieltäytymissäännöllä. Tulokset olivat qwen3:4b-instruct **85 %** ja gemma3:4b **88 %**. Kumpikaan ei enää keksinyt vastauksia.

Samat luvut ovat koneluettavina tiedostossa `llm_summary.csv`.

## Miksi qwen3:4b-instruct eikä gemma3:4b

gemma3:4b sai korjausten jälkeen hieman paremman tuloksen (88 % vs. 85 %). Ero on yksi vastaus 24:stä. qwen valittiin silti, koska:

- Se käsittelee promptin noin 2,4 kertaa nopeammin kuin gemma3:4b. Tällä on merkitystä, koska oikeat RAG-promptit ovat noin 1500 tokenia pitkiä.
- Kaikki englanninkieliset vastaukset olivat oikein, ja suomenkieliset vastaukset olivat ymmärrettäviä.
- Se noudattaa kieltäytymissääntöä täsmälleen.

Käytä tagia `-instruct-2507`. Pelkkä `qwen3:4b` kirjoittaa päättelynsä vastaukseen ja on hyvin hidas.

## Suurin löydetty riski

Ilman korjausta jokainen malli keksi vastauksia suomeksi, esimerkiksi väärän Wi-Fi-salasanan tai työpajan kellonajan. Nykyisessä järjestelmäpromptissa on vain yleinen kielto keksiä asioita, eikä se riitä.

## Ohjeet mallin vaihtamiseen

Näitä muutoksia ei ole vielä tehty sovellukseen. Ne kannattaa tehdä omassa branchissa ja PR:ssä, koska ne muuttavat sovelluksen toimintaa.

**1. Vaihda malli**

- `.env.example`, rivi `OLLAMA_MODEL=llama3.2:1b` → `OLLAMA_MODEL=qwen3:4b-instruct-2507-q4_K_M`
- Sama muutos jokaisen kehittäjän omaan `.env`-tiedostoon, koska `.env` ei ole versionhallinnassa.
- Uusi malli latautuu automaattisesti ensimmäisellä käynnistyksellä (`ensure_model` tiedostossa `ollama.py`). Lataus on noin 2,5 GB.

**2. Lähetä lämpötila Ollamalle**

Tiedosto `backend/app/services/llm/ollama.py`, metodi `generate`. Lisää `/api/chat`-kutsun JSONiin `options`-kenttä:

```python
json={
    "model": self._model,
    "stream": False,
    "options": {"temperature": 0.2},
    "messages": [...],
},
```

Nykyään lämpötilaa ei lähetetä, joten malli käyttää oletusarvoaan (yleensä 0.7–0.8).

**3. Lisää kieltäytymissääntö järjestelmäpromptiin**

Tiedosto `backend/app/services/llm/prompt.py`, muuttuja `SYSTEM_PROMPT`. Lisää loppuun:

```text
Never give out passwords, Wi-Fi details, access codes, times, dates or names that are
not written word for word in the verified facts. In that case answer only:
"I don't know. I don't have information about that." In Finnish answer only:
"En tiedä. Minulla ei ole siitä tietoa."
```

Vastaukset ovat samat kuin saman tiedoston `UNKNOWN_ANSWER` ja `UNKNOWN_BY_LANGUAGE["fi"]`.

**4. Testaa uudelleen Nokian palvelimella ennen pilottia**

- Aja sama testi oikealla palvelinraudalla.
- Jos palvelimessa on vähintään 12 GB:n näytönohjain, käynnistä `docker-compose.gpu.yml`:n kanssa ja kokeile myös `gemma3:12b`.

## Tarkistettava ennen käyttöönottoa

- **Muisti:** Samalla koneella ajetaan myös Whisper, Chatterbox-TTS ja embedding-malli. Tarkista, että 3,3 GB:n malli mahtuu muistiin niiden kanssa.
- **Turhat kieltäytymiset:** Sääntö vaatii, että nimi tai aika löytyy faktoista sanasta sanaan. Testaa erityisesti navigointikysymyksiä, ettei malli kieltäydy, kun tieto löytyy faktoista hieman eri muodossa.

## Tiedostot

| Tiedosto | Sisältö |
| --- | --- |
| `README.md` | Tämä yhteenveto ja ohjeet |
| `llm_summary.csv` | Laatu, vastausaika ja muisti malleittain |
