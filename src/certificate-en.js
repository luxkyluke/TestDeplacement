import 'bootstrap/dist/css/bootstrap.min.css'

import './main.css'

import { PDFDocument, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'
import { library, dom } from '@fortawesome/fontawesome-svg-core'
import { faEye, faFilePdf } from '@fortawesome/free-solid-svg-icons'

import './check-updates'
import { $, $$ } from './dom-utils'
import pdfBase from './Attestation_deplacement_International_EN-1.pdf'

library.add(faEye, faFilePdf)

dom.watch()

$('#radio-language-fr').addEventListener('click', async event => {
  window.location.href = '/index'
})

const generateQR = async text => {
  try {
    const opts = {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
    }
    return await QRCode.toDataURL(text, opts)
  } catch (err) {
    console.error(err)
  }
}

function saveProfile () {
  for (const field of $$('#form-profile input')) {
    localStorage.setItem(field.id.substring('field-'.length), field.value)
  }
}

function getProfile () {
  const fields = {}
  for (let i = 0; i < localStorage.length; i++) {
    const name = localStorage.key(i)
    fields[name] = localStorage.getItem(name)
  }
  return fields
}

function idealFontSize (font, text, maxWidth, minSize, defaultSize) {
  let currentSize = defaultSize
  let textWidth = font.widthOfTextAtSize(text, defaultSize)

  while (textWidth > maxWidth && currentSize > minSize) {
    textWidth = font.widthOfTextAtSize(text, --currentSize)
  }

  return (textWidth > maxWidth) ? null : currentSize
}

async function generatePdf (profile, typeNationality, reasons) {
  const creationDate = new Date().toLocaleDateString('fr-FR')
  const creationHour = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')

  const { lastname, firstname, birthday, nationality, address, zipcode, town, country } = profile

  const data = [
    `Cree le: ${creationDate} a ${creationHour}`,
    `Nom: ${lastname}`,
    `Prenom: ${firstname}`,
    `Naissance: ${birthday} (${nationality})`,
    `Adresse: ${address} ${zipcode} ${town} ${country}`,
    'Sortie: N/A',
    `Motifs: ${typeNationality}-${reasons}`,
  ].join(';\n ')

  const existingPdfBytes = await fetch(pdfBase).then(res => res.arrayBuffer())

  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const page1 = pdfDoc.getPages()[0]

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const drawText = (text, x, y, size = 11) => {
    page1.drawText(text, { x, y, size, font })
  }

  drawText(`${firstname} ${lastname}`, 125, 590)
  drawText(birthday, 125, 567)
  drawText(nationality, 125, 545)
  drawText(`${address} ${zipcode}`, 127, 527)
  drawText(`${town}, ${country}`, 127, 505)

  if (typeNationality === 'tiers') {
    if (reasons.includes('residence')) {
      drawText('x', 49, 449, 19)
    }
    if (reasons.includes('transit')) {
      drawText('x', 49, 412, 19)
    }
    if (reasons.includes('prof._sante')) {
      drawText('x', 49, 385, 19)
    }
    if (reasons.includes('marchandises')) {
      drawText('x', 49, 370, 19)
    }
    if (reasons.includes('equipage')) {
      drawText('x', 49, 354, 19)
    }
    if (reasons.includes('diplomatique')) {
      drawText('x', 49, 339, 19)
    }
    if (reasons.includes('frontalier')) {
      drawText('x', 49, 313, 19)
    }
  }

  if (typeNationality === 'eu') {
    if (reasons.includes('resident')) {
      drawText('x', 49, 276, 19)
    }
    if (reasons.includes('transit')) {
      drawText('x', 49, 263, 19)
    }
    if (reasons.includes('prof._sante')) {
      drawText('x', 49, 250, 19)
    }
    if (reasons.includes('marchandises')) {
      drawText('x', 49, 238, 19)
    }
    if (reasons.includes('equipage')) {
      drawText('x', 49, 225, 19)
    }
    if (reasons.includes('diplomatique')) {
      drawText('x', 49, 212, 19)
    }
    if (reasons.includes('frontalier')) {
      drawText('x', 49, 189, 19)
    }
  }
  if (typeNationality === 'fr') {
    drawText('x', 49, 162, 19)
  }
  let locationSize = idealFontSize(font, profile.town, 83, 7, 11)

  if (!locationSize) {
    alert('Le nom de la ville risque de ne pas être affiché correctement en raison de sa longueur. ' +
      'Essayez d\'utiliser des abréviations ("Saint" en "St." par exemple) quand cela est possible.')
    locationSize = 7
  }

  // Fait à :
  drawText(profile.town, 395, 142, locationSize)
  // Le
  drawText(`${new Date().toLocaleDateString('fr-FR', { month: 'numeric', day: 'numeric' })}`, 488, 142)

  const generatedQR = await generateQR(data)

  const qrImage = await pdfDoc.embedPng(generatedQR)

  page1.drawImage(qrImage, {
    x: 450,
    y: 572,
    width: 100,
    height: 100,
  })

  pdfDoc.addPage()
  const page2 = pdfDoc.getPages()[1]
  page2.drawImage(qrImage, {
    x: 50,
    y: page2.getHeight() - 350,
    width: 300,
    height: 300,
  })

  const pdfBytes = await pdfDoc.save()

  return new Blob([pdfBytes], { type: 'application/pdf' })
}

function downloadBlob (blob, fileName) {
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
}

function getAndSaveReasons () {
  const values = $$('input[name="field-reason"]:checked')
    .map(x => x.value)
    .join('-')
  localStorage.setItem('reasons', values)
  return values
}

function getAndSaveTypeNationality () {
  const typeNationality = $$('input[name="field-type-nationality"]:checked')
    .map(x => x.value)
    .join('-')
  localStorage.setItem('typeNationality', typeNationality)

  return typeNationality
}

// see: https://stackoverflow.com/a/32348687/1513045
function isFacebookBrowser () {
  const ua = navigator.userAgent || navigator.vendor || window.opera
  return ua.includes('FBAN') || ua.includes('FBAV')
}

if (isFacebookBrowser()) {
  $('#alert-facebook').value = 'ATTENTION !! Vous utilisez actuellement le navigateur Facebook, ce générateur ne fonctionne pas correctement au sein de ce navigateur ! Merci d\'ouvrir Chrome sur Android ou bien Safari sur iOS.'
  $('#alert-facebook').classList.remove('d-none')
}

function addSlash () {
  $('#field-birthday').value = $('#field-birthday').value.replace(/^(\d{2})$/g, '$1/')
  $('#field-birthday').value = $('#field-birthday').value.replace(/^(\d{2})\/(\d{2})$/g, '$1/$2/')
  $('#field-birthday').value = $('#field-birthday').value.replace(/\/\//g, '/')
}

$('#field-birthday').onkeyup = function () {
  const key = event.keyCode || event.charCode
  if (key === 8 || key === 46) {
    return false
  } else {
    addSlash()
    return false
  }
}

const snackbar = $('#snackbar')

$('#generate-btn').addEventListener('click', async event => {
  event.preventDefault()

  saveProfile()
  const typeNationality = getAndSaveTypeNationality()
  let reasons
  if (typeNationality === 'fr') {
    reasons = 'N/A'
  } else {
    reasons = getAndSaveReasons()
  }

  const pdfBlob = await generatePdf(getProfile(), typeNationality, reasons)
  localStorage.clear()
  const creationDate = new Date().toLocaleDateString('fr-CA')
  const creationHour = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', '-')
  downloadBlob(pdfBlob, `attestation-${creationDate}_${creationHour}.pdf`)

  snackbar.classList.remove('d-none')
  setTimeout(() => snackbar.classList.add('show'), 100)

  setTimeout(function () {
    snackbar.classList.remove('show')
    setTimeout(() => snackbar.classList.add('d-none'), 500)
  }, 6000)
})

$$('input').forEach(input => {
  const exempleElt = input.parentNode.parentNode.querySelector('.exemple')
  if (input.placeholder && exempleElt) {
    input.addEventListener('input', (event) => {
      if (input.value) {
        exempleElt.innerHTML = 'ex.&nbsp;: ' + input.placeholder
      } else {
        exempleElt.innerHTML = ''
      }
    })
  }
})

const conditions = {
  '#field-firstname': {
    condition: 'length',
  },
  '#field-lastname': {
    condition: 'length',
  },
  '#field-birthday': {
    condition: 'pattern',
    pattern: /^([0][1-9]|[1-2][0-9]|30|31)\/([0][1-9]|10|11|12)\/(19[0-9][0-9]|20[0-1][0-9]|2020)/g,
  },
  '#field-nationality': {
    condition: 'length',
  },
  '#field-address': {
    condition: 'length',
  },
  '#field-town': {
    condition: 'length',
  },
  '#field-zipcode': {
    condition: 'lenght',
  },
  '#field-country': {
    condition: 'length',
  },
}

Object.keys(conditions).forEach(field => {
  $(field).addEventListener('input', () => {
    if (conditions[field].condition === 'pattern') {
      const pattern = conditions[field].pattern
      if ($(field).value.match(pattern)) {
        $(field).setAttribute('aria-invalid', 'false')
      } else {
        $(field).setAttribute('aria-invalid', 'true')
      }
    }
    if (conditions[field].condition === 'length') {
      if ($(field).value.length > 0) {
        $(field).setAttribute('aria-invalid', 'false')
      } else {
        $(field).setAttribute('aria-invalid', 'true')
      }
    }
  })
})

function addVersion () {
  document.getElementById('version').innerHTML = `${new Date().getFullYear()} - ${process.env.VERSION}`
}
addVersion()