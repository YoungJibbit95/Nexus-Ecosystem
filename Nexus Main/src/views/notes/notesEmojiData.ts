const EMOJI_GROUPS = [
  {
    id: "smileys",
    label: "Smileys",
    keywords: "faces people emotions",
    emojis:
      "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 🙂‍↕️ 🙂‍↔️ 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😮‍💨 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🫣 🤗 🫡 🤔 🫢 🤭 🤫 🤥 😶 😶‍🌫️ 😐 😑 😬 🫨 🫠 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 😵‍💫 🫥 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕".split(
        " ",
      ),
  },
  {
    id: "hands",
    label: "Hands",
    keywords: "hands gestures body",
    emojis:
      "👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦".split(
        " ",
      ),
  },
  {
    id: "people",
    label: "People",
    keywords: "people roles work",
    emojis:
      "👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 🕵️ 💂 🥷 👷 🧑‍⚕️ 🧑‍🎓 🧑‍🏫 🧑‍⚖️ 🧑‍🌾 🧑‍🍳 🧑‍🔧 🧑‍🏭 🧑‍💼 🧑‍🔬 🧑‍💻 🧑‍🎤 🧑‍🎨 🧑‍✈️ 🧑‍🚀 🧑‍🚒 🧙 🧚 🧛 🧜 🧝 🧞 🧟 🧌 💃 🕺 🕴️ 🧘 🧗 🏃 🚶 🧎 🧍 👯 🧖 🧗‍♀️ 🧗‍♂️".split(
        " ",
      ),
  },
  {
    id: "heart",
    label: "Hearts",
    keywords: "love symbols glow",
    emojis:
      "❤️ 🩷 🧡 💛 💚 💙 🩵 💜 🤎 🖤 🩶 🤍 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓".split(
        " ",
      ),
  },
  {
    id: "work",
    label: "Work",
    keywords: "productivity tasks notes office",
    emojis:
      "💡 📌 📍 ✏️ 📝 📒 📓 📔 📕 📗 📘 📙 📚 📖 🔖 🧾 📋 📁 📂 🗂️ 🗃️ 🗄️ 📇 🗒️ 🗓️ 📆 📅 🕒 ⏰ ⏱️ ⏲️ 🧭 🎯 ✅ ☑️ ✔️ ❌ ❎ ➕ ➖ ➗ ✖️ 🔍 🔎 🔒 🔓 🔑 🛠️ ⚙️ 🧰 🧲 🧪 🧬 🔬 🔭 📡".split(
        " ",
      ),
  },
  {
    id: "tech",
    label: "Tech",
    keywords: "code computer devices",
    emojis:
      "💻 🖥️ 🖨️ ⌨️ 🖱️ 🖲️ 💽 💾 💿 📀 🧮 🎛️ 🎚️ 🎙️ 🎧 📱 ☎️ 📞 📟 📠 🔋 🪫 🔌 💡 🔦 🕯️ 🪔 🧯 🛜 📶 🛰️ 🚀 🛸 🤖 👾 🎮 🕹️ 🧩 🧠 ⚡ 🔥 ✨ 🌟 ⭐ 💫".split(
        " ",
      ),
  },
  {
    id: "nature",
    label: "Nature",
    keywords: "animals plants weather",
    emojis:
      "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪲 🕷️ 🦂 🦟 🦠 🌵 🎄 🌲 🌳 🌴 🪵 🌱 🌿 ☘️ 🍀 🎍 🪴 🎋 🍃 🍂 🍁 🍄 🌾 💐 🌷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌛 🌜 🌚 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌙 🌎 🌍 🌏 🪐 💫 ⭐ 🌟 ✨ ⚡ ☄️ 💥 🔥 🌈 ☀️ ⛅ 🌤️ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ ☃️ ⛄ 🌬️ 💨 💧 💦 ☔".split(
        " ",
      ),
  },
  {
    id: "food",
    label: "Food",
    keywords: "food drink",
    emojis:
      "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🫒 🥑 🍆 🥔 🥕 🌽 🌶️ 🫑 🥒 🥬 🥦 🧄 🧅 🥜 🫘 🌰 🫚 🫛 🍞 🥐 🥖 🫓 🥨 🥯 🥞 🧇 🧀 🍖 🍗 🥩 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🫔 🥙 🧆 🥚 🍳 🥘 🍲 🫕 🥣 🥗 🍿 🧈 🧂 🥫 🍱 🍘 🍙 🍚 🍛 🍜 🍝 🍠 🍢 🍣 🍤 🍥 🥮 🍡 🥟 🥠 🥡 🦪 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 🍮 🍯 🍼 🥛 ☕ 🫖 🍵 🍶 🍾 🍷 🍸 🍹 🍺 🍻 🥂 🥃 🫗 🥤 🧋 🧃 🧉 🧊".split(
        " ",
      ),
  },
  {
    id: "travel",
    label: "Travel",
    keywords: "places transport",
    emojis:
      "🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🏍️ 🛵 🚲 🛴 🛹 🛼 🚁 ✈️ 🛩️ 🛫 🛬 🪂 💺 🚀 🛸 🚉 🚊 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚋 🚃 🚟 🚠 🚡 🛰️ 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ 🛟 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ ⛺ 🛖 🏠 🏡 🏘️ 🏚️ 🏗️ 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛️ ⛪ 🕌 🕍 🛕 🕋".split(
        " ",
      ),
  },
  {
    id: "objects",
    label: "Objects",
    keywords: "objects tools",
    emojis:
      "🎁 🎈 🎏 🎀 🧧 🎊 🎉 🎎 🪩 🪅 🎐 🧸 🪄 🧿 🪬 🕹️ 🧩 🧵 🪡 🧶 🪢 👓 🕶️ 🥽 🥼 🦺 👔 👕 👖 🧣 🧤 🧥 🧦 👗 👘 🥻 🩱 🩲 🩳 👙 👚 👛 👜 👝 🛍️ 🎒 🩴 👞 👟 🥾 🥿 👠 👡 🩰 👢 👑 👒 🎩 🎓 🧢 🪖 ⛑️ 📿 💄 💍 💎 🔇 🔈 🔉 🔊 📢 📣 📯 🔔 🔕 🎼 🎵 🎶 🎙️ 🎤 🎧 📻 🎷 🪗 🎸 🎹 🎺 🎻 🪕 🥁 🪘".split(
        " ",
      ),
  },
  {
    id: "symbols",
    label: "Symbols",
    keywords: "arrows ui signs",
    emojis:
      "⬆️ ↗️ ➡️ ↘️ ⬇️ ↙️ ⬅️ ↖️ ↕️ ↔️ ↩️ ↪️ ⤴️ ⤵️ 🔃 🔄 🔙 🔚 🔛 🔜 🔝 🛐 ⚛️ 🕉️ ✡️ ☸️ ☯️ ✝️ ☦️ ☪️ ☮️ 🕎 🔯 ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ⛎ 🔀 🔁 🔂 ▶️ ⏩ ⏭️ ⏯️ ◀️ ⏪ ⏮️ 🔼 ⏫ 🔽 ⏬ ⏸️ ⏹️ ⏺️ ⏏️ 🎦 🔅 🔆 📶 🛜 📳 📴 ♀️ ♂️ ⚧️ ✖️ ➕ ➖ ➗ 🟰 ♾️ ‼️ ⁉️ ❓ ❔ ❕ ❗ 〰️ 💱 💲 ⚕️ ♻️ ⚜️ 🔱 📛 🔰 ⭕ ✅ ☑️ ✔️ ❌ ❎ ➰ ➿ 〽️ ✳️ ✴️ ❇️ ©️ ®️ ™️".split(
        " ",
      ),
  },
  {
    id: "flags",
    label: "Flags",
    keywords: "flags countries",
    emojis:
      "🏁 🚩 🎌 🏴 🏳️ 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇦🇩 🇦🇪 🇦🇫 🇦🇬 🇦🇮 🇦🇱 🇦🇲 🇦🇴 🇦🇶 🇦🇷 🇦🇸 🇦🇹 🇦🇺 🇦🇼 🇦🇽 🇦🇿 🇧🇦 🇧🇧 🇧🇩 🇧🇪 🇧🇫 🇧🇬 🇧🇭 🇧🇮 🇧🇯 🇧🇱 🇧🇲 🇧🇳 🇧🇴 🇧🇶 🇧🇷 🇧🇸 🇧🇹 🇧🇻 🇧🇼 🇧🇾 🇧🇿 🇨🇦 🇨🇨 🇨🇩 🇨🇫 🇨🇬 🇨🇭 🇨🇮 🇨🇰 🇨🇱 🇨🇲 🇨🇳 🇨🇴 🇨🇵 🇨🇷 🇨🇺 🇨🇻 🇨🇼 🇨🇽 🇨🇾 🇨🇿 🇩🇪 🇩🇯 🇩🇰 🇩🇲 🇩🇴 🇩🇿 🇪🇨 🇪🇪 🇪🇬 🇪🇭 🇪🇷 🇪🇸 🇪🇹 🇪🇺 🇫🇮 🇫🇯 🇫🇰 🇫🇲 🇫🇴 🇫🇷 🇬🇦 🇬🇧 🇬🇩 🇬🇪 🇬🇫 🇬🇬 🇬🇭 🇬🇮 🇬🇱 🇬🇲 🇬🇳 🇬🇵 🇬🇶 🇬🇷 🇬🇸 🇬🇹 🇬🇺 🇬🇼 🇬🇾 🇭🇰 🇭🇲 🇭🇳 🇭🇷 🇭🇹 🇭🇺 🇮🇨 🇮🇩 🇮🇪 🇮🇱 🇮🇲 🇮🇳 🇮🇴 🇮🇶 🇮🇷 🇮🇸 🇮🇹 🇯🇪 🇯🇲 🇯🇴 🇯🇵 🇰🇪 🇰🇬 🇰🇭 🇰🇮 🇰🇲 🇰🇳 🇰🇵 🇰🇷 🇰🇼 🇰🇾 🇰🇿 🇱🇦 🇱🇧 🇱🇨 🇱🇮 🇱🇰 🇱🇷 🇱🇸 🇱🇹 🇱🇺 🇱🇻 🇱🇾 🇲🇦 🇲🇨 🇲🇩 🇲🇪 🇲🇫 🇲🇬 🇲🇭 🇲🇰 🇲🇱 🇲🇲 🇲🇳 🇲🇴 🇲🇵 🇲🇶 🇲🇷 🇲🇸 🇲🇹 🇲🇺 🇲🇻 🇲🇼 🇲🇽 🇲🇾 🇲🇿 🇳🇦 🇳🇨 🇳🇪 🇳🇫 🇳🇬 🇳🇮 🇳🇱 🇳🇴 🇳🇵 🇳🇷 🇳🇺 🇳🇿 🇴🇲 🇵🇦 🇵🇪 🇵🇫 🇵🇬 🇵🇭 🇵🇰 🇵🇱 🇵🇲 🇵🇳 🇵🇷 🇵🇸 🇵🇹 🇵🇼 🇵🇾 🇶🇦 🇷🇪 🇷🇴 🇷🇸 🇷🇺 🇷🇼 🇸🇦 🇸🇧 🇸🇨 🇸🇩 🇸🇪 🇸🇬 🇸🇭 🇸🇮 🇸🇯 🇸🇰 🇸🇱 🇸🇲 🇸🇳 🇸🇴 🇸🇷 🇸🇸 🇸🇹 🇸🇻 🇸🇽 🇸🇾 🇸🇿 🇹🇦 🇹🇨 🇹🇩 🇹🇫 🇹🇬 🇹🇭 🇹🇯 🇹🇰 🇹🇱 🇹🇲 🇹🇳 🇹🇴 🇹🇷 🇹🇹 🇹🇻 🇹🇼 🇹🇿 🇺🇦 🇺🇬 🇺🇲 🇺🇳 🇺🇸 🇺🇾 🇺🇿 🇻🇦 🇻🇨 🇻🇪 🇻🇬 🇻🇮 🇻🇳 🇻🇺 🇼🇫 🇼🇸 🇽🇰 🇾🇪 🇾🇹 🇿🇦 🇿🇲 🇿🇼".split(
        " ",
      ),
  },
] as const;
const EXTRA_EMOJI_GROUPS = [
  {
    id: "activities",
    label: "Activities",
    keywords:
      "sports games activity feiern celebration trophy award musik music art kunst hobbies spiel spielen sport medaille",
    emojis:
      "⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🪘 🎷 🎺 🪗 🎸 🪕 🎻 🎲 ♟️ 🎯 🎳 🎮 🎰 🧩".split(
        " ",
      ),
  },
  {
    id: "shapes",
    label: "Shapes",
    keywords:
      "farben colors shapes kreis quadrat circle square symbol ui marker punkt status",
    emojis:
      "🔴 🟠 🟡 🟢 🔵 🟣 🟤 ⚫ ⚪ 🟥 🟧 🟨 🟩 🟦 🟪 🟫 ⬛ ⬜ ◼️ ◻️ ◾ ◽ ▪️ ▫️ 🔶 🔷 🔸 🔹 🔺 🔻 💠 🔘 🔳 🔲 🧿 🪩 ❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 💯 🔥 ✨ ⭐ 🌟 💫 ⚡".split(
        " ",
      ),
  },
  {
    id: "money",
    label: "Money",
    keywords:
      "money payment billing abo subscription preis price cash bank shop ecommerce lizenz license kauf buy",
    emojis:
      "💰 🪙 💴 💵 💶 💷 💸 💳 🧾 💹 🏦 🏧 💱 💲 🛒 🛍️ 🏷️ 📦 📬 📮 📯 ✉️ 📧 📨 📩 📤 📥 📭 📪 📫 📬 🔐 🔏 🔑 🪪 📜 📝 ✅".split(
        " ",
      ),
  },
  {
    id: "health",
    label: "Health",
    keywords:
      "health medical safety sicherheit warning alert bug fix danger support care",
    emojis:
      "⚕️ 🩺 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡️ 🤒 🤕 😷 🤧 🤢 🤮 🧼 🧽 🧴 🪥 🚿 🛁 🧯 🦺 ⚠️ 🚨 🛑 ⛔ ☢️ ☣️ 🛡️ 🔒 🔓 🔍 🧰 🛠️".split(
        " ",
      ),
  },
  {
    id: "time",
    label: "Time",
    keywords:
      "time date calendar clock reminder termin deadline zeit datum schedule",
    emojis:
      "⏰ ⏱️ ⏲️ 🕰️ ⌛ ⏳ 📅 📆 🗓️ 📌 📍 🔔 🔕 🕛 🕧 🕐 🕜 🕑 🕝 🕒 🕞 🕓 🕟 🕔 🕠 🕕 🕡 🕖 🕢 🕗 🕣 🕘 🕤 🕙 🕥 🕚 🕦".split(
        " ",
      ),
  },
] as const;
export const NOTES_EMOJI_GROUPS = [...EMOJI_GROUPS, ...EXTRA_EMOJI_GROUPS] as const;
const EMOJI_SEARCH_ALIASES = [
  {
    terms: "rocket rakete launch deploy start ship release",
    emojis: "🚀 🛸 ✨".split(" "),
  },
  {
    terms: "heart herz love liebe favorite favourite fave",
    emojis: "❤️ 🩷 🧡 💛 💚 💙 🩵 💜 🖤 🤍 💖 💗 💘".split(" "),
  },
  {
    terms: "todo done check task aufgabe erledigt fertig success ok yes",
    emojis: "✅ ☑️ ✔️ 📋 📝 🎯".split(" "),
  },
  {
    terms:
      "bug error warning danger alert fehler warnung fix security sicherheit",
    emojis: "🐛 ⚠️ 🚨 ❌ 🛑 🛡️ 🔒 🧰".split(" "),
  },
  {
    terms: "idea light bulb idee denk denken concept concepting",
    emojis: "💡 🧠 ✨ 📌".split(" "),
  },
  {
    terms:
      "note notes doc docs document markdown readme schreiben schreiben text",
    emojis: "📝 📒 📓 📚 📖 🔖 📌 ✏️".split(" "),
  },
  {
    terms: "code dev developer computer laptop terminal tech programmieren",
    emojis: "💻 🖥️ ⌨️ 🤖 ⚙️ 🧩".split(" "),
  },
  {
    terms: "calendar reminder date time deadline termin zeit heute today",
    emojis: "📅 🗓️ ⏰ 🔔 ⏳ 📌".split(" "),
  },
  {
    terms:
      "money payment pay abo subscription billing preis price lizenz license",
    emojis: "💰 🪙 💳 🧾 🏦 🏷️".split(" "),
  },
  {
    terms: "happy smile lachen lol joy freude grinsen",
    emojis: "😀 😄 😁 😂 🤣 😊 🥳".split(" "),
  },
  {
    terms: "sad cry traurig weinen upset",
    emojis: "😞 😢 😭 🥺 😔".split(" "),
  },
  {
    terms: "fire lit hot urgent priority wichtig high",
    emojis: "🔥 ⚡ 🚨 ⭐ 💯".split(" "),
  },
  {
    terms: "star favorite glow magic magie sparkle premium",
    emojis: "⭐ 🌟 ✨ 💫 🪄 💎".split(" "),
  },
  {
    terms: "admin control settings gear config tool werkzeug",
    emojis: "⚙️ 🛠️ 🧰 🔧 🛡️".split(" "),
  },
  {
    terms: "canvas map graph mindmap nodes connection link network",
    emojis: "🧠 🗺️ 🔗 🧩 🕸️ 📍".split(" "),
  },
  {
    terms: "file folder files ordner datei download upload export import",
    emojis: "📁 📂 🗂️ 📦 ⬇️ ⬆️ 💾".split(" "),
  },
  {
    terms: "search find suche finden lupe filter",
    emojis: "🔍 🔎 🧭 📌".split(" "),
  },
  {
    terms: "mobile phone handy smartphone call message",
    emojis: "📱 ☎️ 💬 📲".split(" "),
  },
] as const;
export const EMOJI_ALIAS_TEXT = (() => {
  const map = new Map<string, string>();
  EMOJI_SEARCH_ALIASES.forEach((entry) => {
    entry.emojis.forEach((emoji) => {
      map.set(emoji, `${map.get(emoji) || ""} ${entry.terms}`);
    });
  });
  return map;
})();
export const normalizeEmojiQueryText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");

export type NotesEmojiGroup = (typeof NOTES_EMOJI_GROUPS)[number];
