/* 아주 작은 .xlsx 만들기 도구(외부 라이브러리 없음). 인쇄 설정: A4 가로, 한 쪽 너비 맞춤, 머리행 반복.
   XlsxLite.download({ filename, sheet, title, head:[[..]], merges:[[r1,c1,r2,c2]], rows:[[..]], widths:[..], totalRow:true }) */
(function (root) {
  'use strict';
  const enc = new TextEncoder();
  const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const col = n => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; };
  const CRC = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(files) {   // 무압축(store) ZIP
    const parts = [], central = []; let off = 0;
    const u16 = n => [n & 255, (n >>> 8) & 255], u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
    files.forEach(([name, text]) => {
      const nm = enc.encode(name), data = enc.encode(text), crc = crc32(data);
      const local = new Uint8Array([0x50, 0x4b, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nm.length), 0, 0]);
      parts.push(local, nm, data);
      central.push(new Uint8Array([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nm.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(off)]), nm);
      off += local.length + nm.length + data.length;
    });
    const csize = central.reduce((a, b) => a + b.length, 0);
    const end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(csize), ...u32(off), 0, 0]);
    const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
    let p = 0; all.forEach(b => { out.set(b, p); p += b.length; });
    return out;
  }
  function build(o) {
    const head = o.head || [], rows = o.rows || [], nc = Math.max(...head.map(r => r.length), ...rows.map(r => r.length), 1);
    const t0 = o.title ? 1 : 0, h0 = t0, d0 = t0 + head.length, sheet = (o.sheet || 'Sheet1').replace(/[\\\/?*\[\]:]/g, ' ').slice(0, 31);
    const cell = (r, c, v, st) => {
      const ref = col(c) + (r + 1);
      if (v === '' || v == null) return `<c r="${ref}" s="${st}"/>`;
      return typeof v === 'number' && isFinite(v) ? `<c r="${ref}" s="${st}"><v>${v}</v></c>` : `<c r="${ref}" s="${st}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    };
    let xml = '';
    if (o.title) xml += `<row r="1" ht="22" customHeight="1">${cell(0, 0, o.title, 5)}</row>`;
    head.forEach((r, i) => { xml += `<row r="${h0 + i + 1}" ht="20" customHeight="1">` + Array.from({ length: nc }, (_, c) => cell(h0 + i, c, r[c] == null ? '' : r[c], 1)).join('') + '</row>'; });
    rows.forEach((r, i) => { const tot = o.totalRow && i === rows.length - 1;
      xml += `<row r="${d0 + i + 1}">` + Array.from({ length: nc }, (_, c) => { const v = r[c]; return cell(d0 + i, c, v, typeof v === 'number' ? (tot ? 4 : 2) : (tot ? 3 : 0)); }).join('') + '</row>'; });
    const merges = (o.merges || []).map(([r1, c1, r2, c2]) => `<mergeCell ref="${col(c1)}${h0 + r1 + 1}:${col(c2)}${h0 + r2 + 1}"/>`);
    if (o.title && nc > 1) merges.unshift(`<mergeCell ref="A1:${col(nc - 1)}1"/>`);
    const widths = Array.from({ length: nc }, (_, i) => (o.widths && o.widths[i]) || 10);
    const ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"', X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    const sheetXml = X + `<worksheet ${ns}><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${col(nc - 1)}${d0 + rows.length}"/>` +
      `<sheetViews><sheetView workbookViewId="0"><pane xSplit="1" ySplit="${d0}" topLeftCell="B${d0 + 1}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="16"/>` +
      `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${xml}</sheetData>` +
      (merges.length ? `<mergeCells count="${merges.length}">${merges.join('')}</mergeCells>` : '') +
      `<printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>` +
      `<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;C&amp;P / &amp;N</oddFooter></headerFooter></worksheet>`;
    const font = (b, color) => `<font>${b ? '<b/>' : ''}<sz val="10"/>${color ? `<color rgb="${color}"/>` : ''}<name val="맑은 고딕"/><family val="2"/></font>`;
    const border = '<border><left style="thin"><color rgb="FFBFC8D6"/></left><right style="thin"><color rgb="FFBFC8D6"/></right><top style="thin"><color rgb="FFBFC8D6"/></top><bottom style="thin"><color rgb="FFBFC8D6"/></bottom><diagonal/></border>';
    const xf = (f, fl, b, nf, al) => `<xf numFmtId="${nf}" fontId="${f}" fillId="${fl}" borderId="${b}" xfId="0" applyFont="1" applyFill="1" applyBorder="1"${nf ? ' applyNumberFormat="1"' : ''}${al ? ' applyAlignment="1"><alignment ' + al + '/></xf>' : '/>'}`;
    const styles = X + `<styleSheet ${ns}><fonts count="3">${font(false)}${font(true)}${font(true, 'FFFFFFFF')}</fonts>` +
      '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2C4F8A"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE3EAF6"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${border}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="6">${xf(0, 0, 1, 0, 'vertical="center"')}${xf(2, 2, 1, 0, 'horizontal="center" vertical="center" wrapText="1"')}${xf(0, 0, 1, 3, 'vertical="center"')}${xf(1, 3, 1, 0, 'vertical="center"')}${xf(1, 3, 1, 3, 'vertical="center"')}${xf(1, 0, 0, 0, 'vertical="center"')}</cellXfs>` +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    const q = "'" + sheet.replace(/'/g, "''") + "'";
    const workbook = X + `<workbook ${ns} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheet)}" sheetId="1" r:id="rId1"/></sheets>` +
      (d0 ? `<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">${esc(q)}!$${h0 + 1}:$${d0}</definedName></definedNames>` : '') + '</workbook>';
    return zip([
      ['[Content_Types].xml', X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', workbook],
      ['xl/_rels/workbook.xml.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/worksheets/sheet1.xml', sheetXml], ['xl/styles.xml', styles]]);
  }
  // 파일 저장: 일반 웹사이트에서는 바로 내려받고, claude.ai 미리보기 안에서는 그쪽 저장 창을 쓴다
  let dlCap;
  function saveFile(filename, blob) {
    const direct = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.rel = 'noopener'; a.style.display = 'none';
      document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); return 'saved'; };
    const c = root.claude;
    if (!c || typeof c.use !== 'function') return Promise.resolve(direct());
    if (dlCap === undefined) dlCap = Promise.resolve(c.use('downloads')).catch(() => null);
    return dlCap.then(d => d ? d.save({ filename, data: blob }).then(() => 'saved', e => (e && e.code === 'declined') ? 'declined' : (e && /unavailable|not_granted|capability/.test(e.code || '')) ? direct() : 'failed') : direct());
  }
  function download(o) {
    return saveFile(o.filename || 'data.xlsx', new Blob([build(o)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  }
  root.XlsxLite = { build, download, saveFile };
  if (typeof module !== 'undefined') module.exports = root.XlsxLite;
})(typeof window !== 'undefined' ? window : globalThis);
