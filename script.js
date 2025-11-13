document.addEventListener('DOMContentLoaded', () => {
  const birthYearInput = document.getElementById('birthYearInput');
  const birthMonth = document.getElementById('birthMonth');
  const birthDay = document.getElementById('birthDay');

  // 年を4桁入力したら月/日セレクトを表示して月にフォーカス
  if (birthYearInput) {
    birthYearInput.addEventListener('input', () => {
      const v = birthYearInput.value.replace(/\D/g, ''); // 数字のみ
      birthYearInput.value = v;
      if (v.length === 4) {
        // 表示
        if (birthMonth) birthMonth.style.display = '';
        if (birthDay) birthDay.style.display = '';
        if (birthMonth) birthMonth.focus();
      } else {
        // 非表示かつ選択をリセット
        if (birthMonth) {
          birthMonth.style.display = 'none';
          birthMonth.value = '';
        }
        if (birthDay) {
          birthDay.style.display = 'none';
          birthDay.value = '';
        }
      }
    });
  }
});

function calculateNumber() {
  const rawName = document.getElementById("nameInput").value.trim();
  const name = rawName.toLowerCase();
  const birth = document.getElementById("birthInput").value;

  // ヘルパー: IT Table をクリア/更新
  function updateItTable(counts) {
    for (let i = 1; i <= 9; i++) {
      const el = document.getElementById(`it-count-${i}`);
      if (el) el.textContent = counts ? (counts[i] || 0) : '0';
    }
  }

  // 全角変換ヘルパー
  function toFullWidthLetter(ch) {
    if (!ch) return '\u3000';
    const uc = ch.toUpperCase();
    const code = uc.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      return String.fromCharCode(0xFF21 + (code - 65)); // Ａ〜Ｚ
    }
    if (ch === ' ') return '\u3000';
    return ch;
  }
  function toFullWidthDigit(n) {
    if (typeof n !== 'number' || Number.isNaN(n)) return '\u3000';
    if (n >= 0 && n <= 9) return String.fromCharCode(0xFF10 + n); // ０〜９
    // 二桁（例:11,22,33）の場合はそれぞれの桁を全角で繋ぐ
    return String(n).split('').map(d => {
      const v = parseInt(d, 10);
      return Number.isNaN(v) ? '\u3000' : String.fromCharCode(0xFF10 + v);
    }).join('');
  }

  if (!rawName || !birth) {
    document.getElementById("result").textContent = "⚠️ 名前と生年月日を入力してください。";
    // ラベルもクリア
    ['label-top','label-right','label-bottom','label-left'].forEach(id=>{
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
    // 名前表示クリア
    const fwNameEl = document.getElementById('fwName');
    const fwMapEl = document.getElementById('fwMapping');
    if (fwNameEl) fwNameEl.textContent = '';
    if (fwMapEl) fwMapEl.textContent = '';
    updateItTable(null);
    return;
  }

  // 名前 → 各文字を数字化 (A〜Z を 1〜9 で循環)
  let nameValue = 0;
  let snValue = 0; // 母音用の値 (a,i,u,e,o)
  let pnValue = 0; // 母音以外（子音）用の値
  const counts = Array(10).fill(0); // 1〜9 の出現回数カウント (index 0 は未使用)

  // 表示用配列
  const dispLetters = [];
  const dispNums = [];

  for (let i = 0; i < rawName.length; i++) {
    const ch = rawName[i];
    const lower = ch.toLowerCase();
    const code = lower.charCodeAt(0);
    if (code >= 97 && code <= 122) { // a〜z
      const val = ((code - 97) % 9) + 1;
      nameValue += val;
      counts[val] += 1;
      if ('aeiou'.includes(lower)) {
        snValue += val;
      } else {
        pnValue += val;
      }
      dispLetters.push(toFullWidthLetter(ch));
      dispNums.push(toFullWidthDigit(val));
    } else {
      // 英字以外は全角スペース表示
      dispLetters.push('\u3000');
      dispNums.push('\u3000');
    }
  }

  // 数字を一桁になるまで足す関数（mastersで終了条件を指定）
  function sumDigits(num, masters = [11, 22, 33]) {
    let sum = 0;
    String(num).split('').forEach(d => {
      const n = parseInt(d, 10);
      if (!Number.isNaN(n)) sum += n;
    });
    if (sum > 9 && !masters.includes(sum)) {
      return sumDigits(sum, masters);
    }
    return sum;
  }

  // 生年月日を数値化して各桁を足す（LPN計算） - masters: 11,22,33 を維持
  const birthValue = birth.replaceAll("-", "");
  let lpn = sumDigits(birthValue); // マスターナンバー 11,22,33 を維持

  // 名前の数値を一桁になるまで足す（DN計算）
  let dn = sumDigits(nameValue); // マスターナンバー 11,22,33 を維持

  // 母音の数値を一桁になるまで足す（SN計算）
  let sn = sumDigits(snValue); // マスターナンバー 11,22,33 を維持

  // 母音以外（子音）の数値を一桁になるまで足す（PN計算）
  let pn = sumDigits(pnValue); // マスターナンバー 11,22,33 を維持

  // M: LPN と DN の合計（そのまま合計を表示） -> 一桁になるまで加算、11/22/33で停止
  const m = sumDigits(lpn + dn);

  // BN: 生年月日の「日」を一桁になるまで足す（11,22で終了）
  const dayPart = birth.includes('/')
    ? birth.split("/")[2]  // YYYY/MM/DD形式の場合
    : birth.slice(-2);     // YYYYMMDD形式の場合
  const bn = dayPart ? sumDigits(parseInt(dayPart, 10), [11, 22, 33]) : "";

  // IN: 名前変換で最も多く出てきた数字(複数ある場合は全て)
  const maxCount = Math.max(...counts.slice(1));
  const inNumbers = maxCount > 0
    ? counts.map((c, i) => (i >= 1 && i <= 9 && c === maxCount ? i : null)).filter(Boolean)
    : [];

  // LLN: 名前変換で出てこなかった数字(1〜9 のうち出現回数が0のもの)
  const llnNumbers = [];
  for (let i = 1; i <= 9; i++) {
    if (counts[i] === 0) llnNumbers.push(i);
  }

  const resultLines = [
    `M ${m}`,
    `B ${bn}`,
    `IT ${inNumbers.length ? inNumbers.join(", ") : "なし"}`,
    `LL ${llnNumbers.length ? llnNumbers.join(", ") : "なし"}`
  ];

  document.getElementById("result").textContent = resultLines.join("\n");

  // 図のラベルに値をセット（上:P 右:D 下:S 左:LP）
  const topEl    = document.getElementById('label-top');
  const rightEl  = document.getElementById('label-right');
  const bottomEl = document.getElementById('label-bottom');
  const leftEl   = document.getElementById('label-left');

  if (topEl)    topEl.textContent    = `P ${pn}`;
  if (rightEl)  rightEl.textContent  = `D ${dn}`;
  if (bottomEl) bottomEl.textContent = `S ${sn}`;
  if (leftEl)   leftEl.textContent   = `LP ${lpn}`;

  // IT Table を更新（1〜9 の出現回数を表示）
  updateItTable(counts);

  // 名前表示を更新（全角大文字と全角数字マッピング）
  const fwNameEl = document.getElementById('fwName');
  const fwMapEl = document.getElementById('fwMapping');
  if (fwNameEl) fwNameEl.textContent = dispLetters.join('');
  if (fwMapEl)  fwMapEl.textContent  = dispNums.join('');
}
