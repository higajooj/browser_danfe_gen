import { esc } from '../escape'
import { formatDecimal, maskCnpj, maskCpf, maskFone, splitDateTime } from '../format'
import type { DanfeOptions } from '../options'
import { qrSvg } from '../qrcode/qrcode'
import { joined, localidade, money, negate, slots, sumMoney } from './format'
import { nfseLogo } from './logo'
import type { Nfse, NfseParty } from './parse'
import { danfseCss } from './styles'

function field(label: string, value: string | null, span = 1, highlighted = false): string {
  return `<div class="field${highlighted ? ' highlight' : ''}" data-span="${span}"><div class="label">${esc(label)}</div><div class="value">${esc(value === '' ? '-' : value ?? '')}</div></div>`
}

const row = (...cells: string[]) => `<div class="row">${cells.join('')}</div>`
const heading = (label: string) => `<h2 class="block-title">${esc(label)}</h2>`
const block = (...rows: string[]) => `<section class="block">${rows.join('')}</section>`
const compact = (text: string) => `<section class="block compact">${heading(text)}</section>`

const codeLabel = (code: string, labels: Readonly<Record<string, string>>) =>
  Object.hasOwn(labels, code) ? labels[code]! : code

const dateTime = (s: string) => {
  const { date, time } = splitDateTime(s)
  return [date, time].filter(Boolean).join(' ')
}

const pct = (s: string) => s ? `${formatDecimal(s)}%` : ''

function identification(nfse: Nfse): string {
  const { ide, chave, serv } = nfse
  const municipio = serv.cTribNac.startsWith('99') ? '' : localidade(ide.cLocEmi, ide.xLocEmi, ide.UFEmi)
  const generator = codeLabel(ide.ambGer, { '1': 'Prefeitura', '2': 'Sistema Nacional da NFS-e' })
  const environment = codeLabel(ide.tpAmb, { '1': 'Produção', '2': 'Homologação' })
  const qrUrl = `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${chave}`
  return `<header>
  <img alt="NFS-e" src="${nfseLogo}">
  <h1>DANFSe v2.0<br>Documento Auxiliar da NFS-e${ide.tpAmb === '2' ? '<span class="notice">NFS-e SEM VALIDADE JURÍDICA</span>' : ''}</h1>
  <div class="environment">${municipio ? `<div class="municipio">Município: ${esc(municipio)}</div>` : ''}
  <div>Ambiente Gerador: ${esc(generator || '-')}</div><div>Tipo de Ambiente: ${esc(environment || '-')}</div></div>
</header>
<div class="identification"><div class="identification-fields">
  ${field('Chave de Acesso da NFS-e', chave, 3)}
  ${field('Número da NFS-e', ide.nNFSe)}
  ${field('Competência da NFS-e', dateTime(ide.dCompet))}
  ${field('Data e Hora da Emissão da NFS-e', dateTime(ide.dhProc))}
  ${field('Número da DPS', ide.nDPS)}
  ${field('Série da DPS', ide.serie)}
  ${field('Data e Hora da Emissão da DPS', dateTime(ide.dhEmi))}
  ${field('Emitente da NFS-e', codeLabel(ide.tpEmit, { '1': 'Prestador', '2': 'Tomador', '3': 'Intermediário' }), 1, true)}
  ${field('Situação da NFS-e', codeLabel(ide.cStat, { '100': 'NFS-e Gerada', '102': 'NFS-e de Decisão Judicial ou Administrativa', '103': 'NFS-e Avulsa', '107': 'NFS-e MEI' }))}
  ${field('Finalidade', codeLabel(ide.finNFSe, { '0': 'NFS-e regular', '1': 'NFS-e de crédito', '2': 'NFS-e de débito' }))}
</div><div class="consulta">
  ${qrSvg(qrUrl, { sizeCm: 1.9, label: 'Consulta pública da NFS-e' })}
  A autenticidade desta NFS-e pode ser verificada<br>pela leitura deste código QR ou pela consulta da<br>chave de acesso no portal nacional da NFS-e
</div></div>`
}

function partyRows(title: string, party: NfseParty, isRecipient = false): string[] {
  const { end } = party
  const doc = maskCnpj(party.CNPJ) || maskCpf(party.CPF) || party.NIF
  return [
    row(
      heading(title),
      field('CNPJ / CPF / NIF', doc),
      isRecipient ? '<div></div>' : field('Indicador Municipal (Inscrição)', party.IM),
      field('Telefone', end.cPais ? party.fone : maskFone(party.fone)),
    ),
    row(
      field('Nome / Nome Empresarial', party.xNome, 2),
      field('Município / Sigla UF', end.xCidade
        ? joined(end.xCidade, end.xEstProvReg, end.cPais)
        : localidade(end.cMun, '', end.UF)),
      field('Código IBGE / CEP', end.cEndPost || joined(end.cMun, end.CEP.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2-$3'))),
    ),
    row(
      field('Endereço', [end.xLgr, end.nro, end.xCpl, end.xBairro].filter(Boolean).join(', '), 2),
      field('E-mail', party.email, 2),
    ),
  ]
}

function parties(nfse: Nfse): string {
  const { prest, toma, dest, interm, regTrib } = nfse
  return block(
    ...partyRows('Prestador / Fornecedor', prest),
    row(
      field('Simples Nacional na Data de Competência', codeLabel(regTrib.opSimpNac, {
        '1': 'Não Optante',
        '2': 'Optante – Microempreendedor Individual (MEI)',
        '3': 'Optante – Microempresa ou Empresa de Pequeno Porte (ME/EPP)',
        '4': 'Optante Pendente',
      }), 2),
      field('Regime de Apuração Tributária pelo SN', codeLabel(regTrib.regApTribSN, {
        '1': 'Regime de apuração dos tributos federais e municipal pelo Simples Nacional',
        '2': 'Tributos federais pelo Simples Nacional e ISSQN fora do Simples Nacional',
        '3': 'Tributos federais e municipal fora do Simples Nacional',
      }), 2),
    ),
  ) + (toma
    ? block(...partyRows('Tomador / Adquirente', toma))
    : compact('Tomador/Adquirente da operação não identificado na NFS-e'))
    + recipient(nfse, dest)
    + (interm
      ? block(...partyRows('Intermediário da Operação', interm))
      : compact('Intermediário da operação não identificado na NFS-e'))
}

function recipient(nfse: Nfse, dest: NfseParty | null): string {
  if (nfse.indDest === '0' && nfse.toma) return compact('O destinatário é o próprio tomador/adquirente da operação')
  if (dest) return block(...partyRows('Destinatário da Operação', dest, true))
  return compact('Destinatário da operação não identificado na NFS-e')
}

function service({ serv }: Nfse): string {
  const place = localidade(serv.cLocPrestacao, serv.xLocPrestacao)
  return block(
    row(
      heading('Serviço Prestado'),
      field('Código de Tributação Nacional / Municipal', slots(serv.cTribNac.replace(/^(\d{2})(\d{2})(\d{2})$/, '$1.$2.$3'), serv.cTribMun)),
      field('Código da NBS', serv.cNBS.replace(/^(\d)(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3.$4')),
      field('Local da Prestação / Sigla UF / País', joined(place, serv.cPaisPrestacao || (/^[1-5]\d{6}$/.test(serv.cLocPrestacao) ? 'BR' : ''))),
    ),
    `<div class="service-code value">${esc(serv.xTribMun || serv.xTribNac || '-')}</div>
    <div class="service-description"><div class="label">Descrição do Serviço</div><div class="long-text">${esc(serv.xDescServ || '-')}</div></div>`,
  )
}

function municipal({ issqn: m, regTrib, ibsCbs: ibs, totals }: Nfse): string {
  if (m.tribISSQN === '4' || !m.tribISSQN) return compact('Tributação Municipal (ISSQN) - Operação não sujeita ao ISSQN')
  const adjustment = m.vAjusteBCISSQN || m.vCalcAjusteBCISSQN
    ? sumMoney(m.vAjusteBCISSQN, m.vCalcAjusteBCISSQN)
    : m.vDR ? money(m.vDR) : sumMoney(m.vCalcDR, ibs.vCalcReeRepRes)
  return block(
    row(
      heading('Tributação Municipal (ISSQN)'),
      field('Tipo de Tributação do ISSQN', codeLabel(m.tribISSQN, {
        '1': 'Operação Tributável', '2': 'Imunidade', '3': 'Exportação de Serviço',
      })),
      field('Município / Sigla UF / País da Incidência do ISSQN',
        joined(localidade(m.cLocIncid, m.xLocIncid), m.cPaisResult || (m.cLocIncid && 'BR')), 2),
    ),
    row(
      field('Regime Especial de Tributação do ISSQN', codeLabel(regTrib.regEspTrib, {
        '0': 'Nenhum', '1': 'Ato Cooperado (Cooperativa)', '2': 'Estimativa', '3': 'Microempresa Municipal',
        '4': 'Notário ou Registrador', '5': 'Profissional Autônomo', '6': 'Sociedade de Profissionais', '9': 'Outros',
      })),
      field('Tipo de Imunidade do ISSQN', codeLabel(m.tpImunidade, {
        '0': 'Tipo não informado na nota de origem', '1': 'Patrimônio, renda ou serviços, uns dos outros',
        '2': 'Templos de qualquer culto', '3': 'Patrimônio, renda ou serviços das entidades do art. 150, VI, c, da CF',
        '4': 'Livros, jornais, periódicos e o papel destinado a sua impressão',
        '5': 'Fonogramas e videofonogramas musicais produzidos no Brasil',
      })),
      field('Suspensão da Exigibilidade do ISSQN', codeLabel(m.tpSusp, {
        '1': 'Exigibilidade Suspensa por Decisão Judicial', '2': 'Exigibilidade Suspensa por Processo Administrativo',
      })),
      field('Número Processo Suspensão', m.nProcesso),
    ),
    row(
      field('Benefício Municipal', codeLabel(m.tpBM, {
        '1': 'Isenção', '2': 'Redução Percentual da Base de Cálculo',
        '3': 'Redução em Valor da Base de Cálculo', '4': 'Alíquota Diferenciada',
      })),
      field('Cálculo do BM', money(m.vCalcBM || m.vRedBCBM)),
      field('Total Deduções/Reduções', adjustment),
      field('Desconto Incondicionado', money(totals.vDescIncond)),
    ),
    row(
      field('BC ISSQN', money(m.vBC)),
      field('Alíquota Aplicada', pct(m.pAliqAplic)),
      field('Retenção do ISSQN', codeLabel(m.tpRetISSQN, { '1': 'Não Retido', '2': 'Retido pelo Tomador', '3': 'Retido pelo Intermediário' })),
      field('ISSQN Apurado', money(m.vISSQN)),
    ),
  )
}

function federal({ federal: f, ide }: Nfse): string {
  const pisCofinsRetidos = f.tpRetPisCofins === '1'
  return block(
    row(
      heading('Tributação Federal (Exceto CBS)'),
      field('IRRF', money(f.vRetIRRF)),
      field('Contribuição Previdenciária – Retida', money(f.vRetCP)),
      field('Contribuições Sociais – Retidas', pisCofinsRetidos ? sumMoney(f.vRetCSLL, f.vPis, f.vCofins) : money(f.vRetCSLL)),
    ),
    ide.dCompet && ide.dCompet < '2027-01-01' ? row(
      field('PIS – Débito Apuração Própria', money(pisCofinsRetidos ? '0' : f.vPis)),
      field('COFINS – Débito Apuração Própria', money(pisCofinsRetidos ? '0' : f.vCofins)),
      field('Descrição Contrib. Sociais – Retidas', codeLabel(f.tpRetPisCofins, {
        '0': 'PIS/COFINS/CSLL Não Retidos', '1': 'PIS/COFINS Retidos', '2': 'PIS/COFINS Não Retidos',
        '3': 'PIS/COFINS/CSLL Retidos', '4': 'PIS/COFINS Retidos, CSLL Não Retido',
        '5': 'PIS Retido, COFINS/CSLL Não Retidos', '6': 'COFINS Retido, PIS/CSLL Não Retidos',
        '7': 'PIS Não Retido, COFINS/CSLL Retidos', '8': 'PIS/COFINS Não Retidos, CSLL Retido',
        '9': 'COFINS Não Retido, PIS/CSLL Retidos',
      }), 2),
    ) : '',
  )
}

function ibsCbs({ ibsCbs: i, totals, issqn, federal: f, ide }: Nfse): string {
  const before2027 = ide.dCompet && ide.dCompet < '2027-01-01'
  return block(
    row(
      heading('Tributação IBS / CBS'),
      field('CST / cClassTrib', slots(i.CST, i.cClassTrib)),
      field('Indicador de Operação / Código IBGE Incidência / Município Incidência / Sigla UF',
        joined(i.cIndOp, i.cLocalidadeIncid, localidade(i.cLocalidadeIncid, i.xLocalidadeIncid)), 2),
    ),
    row(
      field('Exclusões e Reduções da Base de Cálculo', i.vBC ? sumMoney(
        totals.vDescIncond, i.vCalcAjusteBCIBSCBS || i.vCalcAjusteBCLocImoveis || i.vCalcReeRepRes,
        issqn.vISSQN, before2027 ? f.vPis : '', before2027 ? f.vCofins : '', negate(i.vAjusteBCIBSCBSComExt),
      ) : ''),
      field('Base de Cálculo Após Exclusões e Reduções', money(i.vBC)),
      field('Red. Alíquota IBS / Red. Alíquota CBS', slots(pct(i.pRedAliqUF), pct(i.pRedAliqMun), pct(i.pRedAliqCBS))),
      field('Alíquota – IBS UF / IBS Mun', slots(pct(i.pIBSUF), pct(i.pIBSMun))),
    ),
    row(
      field('Alíq. Efetiva Municipal – IBS', pct(i.pAliqEfetMun)),
      field('Valor Apurado Municipal – IBS', money(i.vIBSMun)),
      field('Alíq. Efetiva Estadual – IBS', pct(i.pAliqEfetUF)),
      field('Valor Apurado Estadual – IBS', money(i.vIBSUF)),
    ),
    row(
      field('Valor Total Apurado – IBS', money(i.vIBSTot)),
      field('Alíquota – CBS', pct(i.pCBS)),
      field('Alíquota Efetiva – CBS', pct(i.pAliqEfetCBS)),
      field('Valor Total Apurado – CBS', money(i.vCBS)),
    ),
  )
}

function totals({ totals: t, ibsCbs: i }: Nfse): string {
  return block(
    row(
      heading('Valor Total da NFS-e'),
      field('Valor da Operação / Serviço', money(t.vServ)),
      field('Desconto Incondicionado', money(t.vDescIncond)),
      field('Desconto Condicionado', money(t.vDescCond)),
    ),
    row(
      field('Total das Retenções (ISSQN / Federais)', money(t.vTotalRet)),
      field('Valor Líquido da NFS-e', money(t.vLiq)),
      field('Total do IBS/CBS', sumMoney(i.vIBSTot, i.vCBS)),
      field('Valor Líquido da NFS-e + IBS/CBS', money(i.vTotNF), 1, true),
    ),
  )
}

function complement({ complement: c }: Nfse): string {
  const entries = [
    ['Inf. Cont.', c.xInfComp], ['NFS-e Subst.', c.chSubstda], ['Doc. Ref.', c.docRef],
    ['Cod. Obra', c.cObra], ['Insc. Imob.', c.inscImobFisc], ['Cod. Evt.', c.idAtvEvt],
    ['Doc. Tec.', c.idDocTec], ['Núm. Ped.', c.xPed], ['Item Ped.', c.xItemPed.filter(Boolean).join(', ')],
    ['Inf. A. T. Mun.', c.xOutInf],
  ]
  const info = entries.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join(' | ')
  const approx = [
    ['Federais', money(c.vTotTribFed) || pct(c.pTotTribFed)],
    ['Estaduais', money(c.vTotTribEst) || pct(c.pTotTribEst)],
    ['Municipais', money(c.vTotTribMun) || pct(c.pTotTribMun)],
  ].map(([label, value]) => `${label}: ${value || '-'}`)
  if (c.pTotTribSN) approx.push(`Simples Nacional: ${pct(c.pTotTribSN)}`)
  return `<section class="block complement">${heading('Informações Complementares')}<div class="field">
  <div class="long-text complement-text">${esc(info || '-')}</div>
  <div class="approx">Totais Aproximados dos Tributos cfe. Lei nº 12.741/2012: ${esc(approx.join('; '))}</div>
</div></section>`
}

export function renderDanfse(nfse: Nfse, options: DanfeOptions): string {
  const title = options.title ?? `DANFSe ${nfse.chave}`
  const status = options.nfse?.situacao
  const watermark = status === 'cancelada' ? 'CANCELADA' : status === 'substituida' ? 'SUBSTITUÍDA' : ''
  const receipt = options.nfse?.canhoto ? `<section class="receipt">${row(
    field('Data Cientificação', null),
    field('Identificação e Assinatura', null),
    field('Nº NFS-e / Chave NFS-e', joined(nfse.ide.nNFSe, nfse.chave), 2),
  )}</section>` : ''
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${danfseCss}</style></head>
<body><section class="page">
${identification(nfse)}
${parties(nfse)}
${service(nfse)}
${municipal(nfse)}
${federal(nfse)}
${ibsCbs(nfse)}
${totals(nfse)}
${complement(nfse)}
${receipt}
${watermark ? `<div class="watermark"><span>${watermark}</span></div>` : ''}
</section></body></html>`
}
