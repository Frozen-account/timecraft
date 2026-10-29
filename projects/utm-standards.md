---
title: UTM-стандарты
summary: Как размечать ссылки и как атрибуция попадает в Telegram
---

# UTM-стандарты

## Правила разметки (предложение — утвердить перед запуском)
Все значения — латиница в нижнем регистре, слова через `_`, без пробелов.

| Параметр | Значение | Пример |
| --- | --- | --- |
| `utm_source` | площадка | `facebook`, `instagram`, `google`, `telegram` |
| `utm_medium` | тип трафика | `paid_social`, `cpc`, `organic_social`, `email` |
| `utm_campaign` | `{сегмент}_{оффер}_{ммгг}` | `jdg_start24h_1126`, `spolka_estcit_1126` |
| `utm_content` | креатив | `video_hook_a`, `static_calc_ru` |
| `utm_term` | аудитория / ключ | `it_b2b_ru`, `lookalike_leads` |

Для Meta Ads используйте динамические параметры: `utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}`.

## Как работает трекинг на лендингах
- Скрипт на всех языковых версиях `jdg.imosta.pl` и `imosta.pl` сохраняет `utm_*`, `fbclid`, `gclid`, внешний referrer и страницу входа.
- Модель **last-touch, 30 дней**: новый рекламный клик перезаписывает сохранённый; заход без меток — нет.
- Хранилище: `localStorage` → `sessionStorage` → память. Сохранение — на основании законного интереса (решение от 26.10.2026).
- При отправке формы данные добавляются в запрос к `/api/send-lead`.

## Блок в Telegram
```
📊 Источник: facebook / paid_social
🎯 Кампания: jdg_start24h_1126
📝 Креатив / Контент: video_hook_a
🔑 Ключ: it_b2b_ru
🔗 Реферер / Клик: fbclid IwAR… · https://l.facebook.com/…
```
Без меток: «прямой заход / нет UTM», «Meta Ads (fbclid, без UTM)», «переход с {сайт}».

## Проверка перед запуском кампании
1. Открыть лендинг с тестовыми метками, переключить язык, отправить форму.
2. Проверить блок источника в Telegram.
3. Проверить в GTM, что `generate_lead` передаётся в Meta Pixel как `Lead`.
