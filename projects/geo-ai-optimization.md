---
title: GEO (AI-Search Optimization)
summary: Комплексная оптимизация imosta.pl под ИИ-поисковики (Perplexity, SearchGPT, Gemini): llms.txt, Schema.org, Direct Answers и E-E-A-T.
status: active
category: Marketing & Tech
---

# GEO (Generative Engine Optimization) — Комплекс мероприятий для imosta.pl

**Статус:** Активный · **Сайт:** imosta.pl (репозиторий `imosta-landing`, статический HTML, локали RU / `ua/` / `eng/`) · **Связанные задачи:** `geo-technical-setup`, `geo-direct-faq`, `geo-eeat-authors`, `geo-nap-citations`

## Цель

Обеспечить регулярное попадание IMOSTA Group в ответы и рекомендации ИИ-поисковиков (Perplexity, SearchGPT / ChatGPT Search, Google Gemini и AI Overviews, Claude) по запросам бухгалтерского обслуживания в Польше.

ИИ-поисковик не «ранжирует страницу», а собирает ответ из фрагментов, которым доверяет. Поэтому задача GEO — сделать так, чтобы:

1. краулеры ИИ **имели доступ** к сайту;
2. на сайте были **короткие, проверяемые, цитируемые** ответы;
3. за ответами стояли **реальные эксперты** с подтверждённой квалификацией;
4. сущность «IMOSTA Group» **одинаково описана** во внешних источниках, которым модели доверяют.

---

## Архитектура комплекса (4 уровня)

### 1. Technical & Machine-Readable Layer

**`/llms.txt` и `/llms-full.txt`**

- `llms.txt` — краткая карта сайта в Markdown для LLM: кто мы, услуги, сегменты (JDG, Spółka z o.o., англоязычные клиенты), диапазоны цен, стек (KSeF, Taxo), контакты и ссылки на ключевые страницы.
- `llms-full.txt` — расширенная версия: полные описания услуг, тарифы, FAQ, профили экспертов.
- Цены в обоих файлах должны совпадать с сайтом и с [бенчмаркингом](/projects/competitor-benchmarking): Starter 1 200 PLN, Growth 1 600–1 800 PLN, Scale 2 200+ PLN.
- ⚠️ `llms.txt` — открытое предложение (llmstxt.org), а не стандарт. Крупные ИИ-поисковики официально не подтверждали, что его используют. Внедрение дешёвое, но основную ставку делаем на уровни 2–4.

**Schema.org JSON-LD граф** (в `<head>` каждой локали, связанный через `@id`):

| Тип | Где | Ключевые свойства |
|---|---|---|
| `AccountingService` (подтип `LocalBusiness`) | Главная | `name`, `url`, `logo`, `address`, `telephone`, `areaServed: PL`, `availableLanguage: [ru, uk, en, pl]`, `sameAs` |
| `Offer` + `PriceSpecification` | Тарифы | `price` / `minPrice` / `maxPrice`, `priceCurrency: PLN`, `unitText: MONTH` |
| `FAQPage` | Блоки FAQ | `Question` / `acceptedAnswer` — текст должен совпадать с видимым на странице |
| `Person` | Профили экспертов | `name`, `jobTitle`, `worksFor`, `knowsAbout`, `hasCredential`, `sameAs` (LinkedIn) |

- Проверка: Google Rich Results Test + validator.schema.org после каждого деплоя.
- ⚠️ Google с 2023 года показывает FAQ rich results почти только для государственных и медицинских сайтов. Разметку `FAQPage` всё равно делаем: она структурирует контент для ИИ, но рост сниппетов в Google не обещаем.

**`robots.txt`** — сейчас в корне `imosta-landing` файла нет (проверено), то есть всё разрешено по умолчанию. Создаём явный файл, чтобы зафиксировать политику:

```txt
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://imosta.pl/sitemap.xml
```

- `OAI-SearchBot` отвечает именно за ChatGPT Search; `GPTBot` — за обучение моделей. Разрешаем оба.
- `/landing/` в `Disallow` **не** добавляем. Он закрыт мета-тегом `noindex, nofollow`, а краулер должен иметь доступ к странице, чтобы этот тег увидеть.
- Нужен `sitemap.xml` со всеми локалями и `hreflang`. Сейчас его нет, он входит в Этап 1.

### 2. Direct Answer Architecture (Content Layer)

**Принцип Inverted Pyramid:** под каждым H2/H3 первые 2–3 строки — прямой фактологический ответ (цифра, срок, статья закона), дальше — детали и нюансы.

> **Пример.** *Когда платить ZUS за месяц?*
> До 20-го числа следующего месяца (для JDG и Spółka, кроме бюджетных учреждений). Пропуск срока — пеня с первого дня просрочки.

**15 структурированных Q&A по ключевым болям** (черновик — Gemini, проверка формулировок — Татьяна Бакаева):

| # | Тема | Вопрос |
|---|---|---|
| 1 | KSeF 2.0 | С какой даты KSeF обязателен для моей фирмы? |
| 2 | KSeF 2.0 | Что проверяет KSeF при выставлении фактуры, а что нет? |
| 3 | KSeF 2.0 | Как выставлять фактуры иностранным клиентам при KSeF? |
| 4 | Импортный VAT | Как работает импортный VAT и когда можно применить механизм art. 33a (без оплаты на таможне)? |
| 5 | Импортный VAT | Что такое PZC и зачем он бухгалтеру? |
| 6 | Wakacje ZUS | Кто имеет право на Wakacje składkowe и как подать заявление? |
| 7 | Wakacje ZUS | Что именно освобождается во время Wakacje ZUS, а что нет? |
| 8 | JDG | Ryczałt, skala или liniowy: что выгоднее при моём доходе? |
| 9 | JDG | Ulga na start и Mały ZUS Plus: сколько я реально плачу? |
| 10 | Spółka vs JDG | С какого дохода Spółka z o.o. выгоднее JDG? |
| 11 | Spółka | Чем рискует Zarząd по art. 299 KSH? |
| 12 | Spółka | Estoński CIT: условия и когда он невыгоден |
| 13 | Spółka | Как легально выплатить прибыль: дивиденды, powołanie, зарплата |
| 14 | Сроки | Ключевые даты месяца: JPK_V7, ZUS, PIT/CIT-авансы |
| 15 | Сервис | Сколько стоит бухгалтерия в Польше и что входит в тариф IMOSTA |

**Сравнительные матрицы и калькуляторы:**

- Таблица налоговых форм JDG (8,5 % / 12 % / 19 % / skala) с примерами при 10 / 20 / 40 тыс. PLN в месяц.
- Estoński CIT против классического CIT.
- Калькулятор «Стоимость бухгалтерии»: тариф × количество документов × сотрудники.
- Таблицы делаем в HTML (`<table>`), а не картинками: ИИ их не прочитает.

### 3. E-E-A-T & Authors (Trust Layer)

- Отдельная страница-профиль для каждого эксперта: **Татьяна Бакаева** (Head of Accounting), далее — остальные бухгалтеры команды.
- Содержание профиля: фото, должность, опыт в годах, специализации (Estoński CIT, KSH, KSeF, JPK_CIT), подтверждённая квалификация, LinkedIn.
- ⚠️ **Квалификация — только реальная и проверяемая.** Государственная лицензия на ведение бухгалтерии в Польше отменена в 2014 году. Указываем то, что есть фактически:
  - бывшее свидетельство Министерства финансов (*świadectwo kwalifikacyjne MF*), если оно выдавалось до дерегуляции;
  - сертификат SKwP (*Certyfikowany Księgowy* и др.);
  - статус *doradca podatkowy* с номером в реестре KIDP, если есть.
  - Номера сертификатов собираем у самих сотрудников.
- Каждая статья и FAQ: блок «Автор / Проверено» с датой обновления и разметкой `author` → `Person` (`@id` профиля).
- Кейсы: анонимизированные, но с цифрами — что было, что сделали, сколько сэкономили.

### 4. Entity & External Knowledge Graph (Citations Layer)

**NAP-синхронизация** — название, адрес и телефон символ в символ одинаковые везде:

| Каталог | Аудитория | Приоритет |
|---|---|---|
| Google Business Profile | Все + Gemini / AI Overviews | 🔴 Высокий |
| Panorama Firm | PL | 🟠 Средний |
| PKT.pl | PL | 🟠 Средний |
| Oferteo | PL (лиды B2B) | 🟠 Средний |
| ALEO | PL (данные KRS) | 🟠 Средний |
| Clutch | EN, англоязычная экспансия | 🟠 Средний |
| GoodFirms | EN, англоязычная экспансия | ⚪ Низкий |

- Перед стартом зафиксировать **эталонный NAP** в этом документе (одна строка названия, адрес в польском формате, телефон в формате +48).
- **Связывание сущности через `sameAs`** в JSON-LD: страница KRS (если Spółka), REGON / CEIDG, LinkedIn-компания, Google Maps (CID), Facebook / Instagram, Clutch.
- Цифровой PR: экспертные комментарии Татьяны для польских и русскоязычных СМИ о бизнесе в Польше, гостевые статьи, упоминания на форумах и в Reddit / Telegram-сообществах без спама.

---

## Roadmap & KPIs

| Этап | Содержание | Срок | Задача |
|---|---|---|---|
| **1. Quick Wins** | `robots.txt`, `sitemap.xml`, `llms.txt` / `llms-full.txt`, JSON-LD `AccountingService` + `Offer` | 1–2 дня | `geo-technical-setup` |
| **2. Контент и FAQ** | 15 Q&A, Inverted Pyramid на ключевых страницах, матрицы налогов, `FAQPage` | 1–2 недели | `geo-direct-faq` |
| **3. E-E-A-T** | Профили экспертов, `Person`, блоки автора | 2–3 недели | `geo-eeat-authors` |
| **4. Цитируемость и PR** | NAP, каталоги, `sameAs`, цифровой PR | Постоянно | `geo-nap-citations` |

**Метрики:**

- **Brand Mentions в ИИ.** Раз в месяц прогоняем фиксированный набор из 20 запросов (RU / EN / PL), например «бухгалтер для JDG в Варшаве на русском» или «accounting firm Poland for foreigners». Проверяем Perplexity, ChatGPT Search, Gemini и Claude. Фиксируем, упомянута ли IMOSTA, на какой позиции и со ссылкой ли. Результаты — в таблицу.
- **Реферальный трафик из ИИ-поисковиков.** Источники `perplexity.ai`, `chatgpt.com`, `gemini.google.com`, `claude.ai` и `copilot.microsoft.com` в аналитике. Отдельный сегмент лидов в Telegram по `utm_source` / referrer (см. [UTM-стандарты](/projects/utm-standards)).
- **Технические:** 0 ошибок в Rich Results Test; все локали в `sitemap.xml`; профиль Google Business верифицирован.
- **Baseline** снимаем до начала Этапа 1, чтобы было с чем сравнивать.
