function createFolderCard(name, previewImage, accentName, sizeMB, fileCount) {
  const validAccents = ['rosewater','flamingo','pink','mauve','red','maroon','peach','yellow','green','teal','sky','sapphire','blue','lavender']

	if (!validAccents.includes(accentName)) {
    console.warn(`Unknown accent "${accentName}", falling back to mauve.`)
    accentName = 'mauve'
  }

  const gridContainer = document.querySelector('.folder-grid')
  if (!gridContainer) {
    console.error("Target folder grid container not found.")
    return
  }

  const imageUrl = URL.createObjectURL(previewImage)
  const card     = document.createElement('div')
  card.className = 'folder-card'
  card.style.setProperty('--accent', `var(--ctp-${accentName}-rgb)`)

  card.innerHTML = `
    <div class="folder-tab">
      <span class="folder-tab-text">${fileCount} Files</span>
    </div>
    <div class="folder-body">
      <div class="folder-preview">
        <img src="${imageUrl}" alt="${name} Preview" onload="URL.revokeObjectURL('${imageUrl}')">
      </div>
      <div class="folder-info">
        <h3 class="folder-title">
					<span>${name}</span>
				</h3>
        <span class="folder-size">${sizeMB} MB</span>
      </div>
    </div>
  `

  gridContainer.appendChild(card)
}

function setupMarquee(root = document) {
  root.querySelectorAll('.folder-title').forEach(title => {
    const span = title.querySelector('span')
    if (span && span.scrollWidth > title.clientWidth) {
      title.classList.add('marquee')
    } else {
      title.classList.remove('marquee')
    }
  })
}


// Fix this later, the icons just look off
function initSortPill() {
	const pill    = document.querySelector('.sort-pill')
	if (!pill) return

	const slider  = pill.querySelector('.sort-slider')
	const options = pill.querySelectorAll('.sort-option')

	function moveSlider(button) {
		slider.style.width     = button.offsetWidth + 'px'
		slider.style.transform = `translateX(${button.offsetLeft}px)`
	}

  function setArrow(option, state) {
    if (option.dataset.sort === 'type') return

    const icon = option.querySelector('i')
    if (!icon) return

    icon.classList.remove('fa-arrow-up', 'fa-arrow-down')
    icon.classList.add(state === 'down' ? 'fa-arrow-down' : 'fa-arrow-up')
  }

  options.forEach(function (option) {
    option.addEventListener('click', function () {
      const wasActive = option.classList.contains('active')
      const saved     = option.dataset.direction

      let direction
      if (wasActive) {
        direction = saved === 'up' ? 'down' : 'up'
      } else {
        direction = saved || 'up'
      }

      options.forEach(function (item) {
        item.classList.remove('active')
        if (item !== option) {
          setArrow(item, item.dataset.direction || 'up')
        }
      })

      option.classList.add('active')
      option.dataset.direction = direction
      setArrow(option, direction)

      moveSlider(option)
    })
  })

	const active = pill.querySelector('.sort-option.active')
	if (active) {
		active.dataset.direction = 'up'
		setArrow(active, 'up')
		moveSlider(active)
	}

	window.addEventListener('resize', function () {
		const current = pill.querySelector('.sort-option.active')
		if (current) moveSlider(current)
	})
}












// Example by Claude:
const palette = [
  'rosewater', 'flamingo', 'pink', 'mauve', 'red', 'maroon',
  'peach', 'yellow', 'green', 'teal', 'sky', 'sapphire', 'blue', 'lavender'
]

const paletteHex = {
  rosewater: '#f5e0dc', flamingo: '#f2cdcd', pink: '#f5c2e7', mauve: '#cba6f7',
  red: '#f38ba8', maroon: '#eba0ac', peach: '#fab387', yellow: '#f9e2af',
  green: '#a6e3a1', teal: '#94e2d5', sky: '#89dceb', sapphire: '#74c7ec',
  blue: '#89b4fa', lavender: '#b4befe'
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function generateRandomCover() {
  const width  = 400
  const height = 300
  const bgName = randomItem(palette)
  const shapeCount = Math.floor(randomBetween(3, 7))

  let shapes = ''
  for (let index = 0; index < shapeCount; index++) {
    const shapeName = randomItem(palette)
    const shapeKind = randomItem(['circle', 'rect', 'triangle'])
    const opacity   = randomBetween(0.3, 0.85).toFixed(2)

    if (shapeKind === 'circle') {
      const radius = randomBetween(20, 90)
      shapes += `<circle cx="${randomBetween(0, width)}" cy="${randomBetween(0, height)}" r="${radius}" fill="${paletteHex[shapeName]}" opacity="${opacity}"/>`
    } else if (shapeKind === 'rect') {
      const boxSize = randomBetween(40, 140)
      shapes += `<rect x="${randomBetween(0, width)}" y="${randomBetween(0, height)}" width="${boxSize}" height="${boxSize}" fill="${paletteHex[shapeName]}" opacity="${opacity}" transform="rotate(${randomBetween(0, 360)} ${width / 2} ${height / 2})"/>`
    } else {
      const pointA = `${randomBetween(0, width)},${randomBetween(0, height)}`
      const pointB = `${randomBetween(0, width)},${randomBetween(0, height)}`
      const pointC = `${randomBetween(0, width)},${randomBetween(0, height)}`
      shapes += `<polygon points="${pointA} ${pointB} ${pointC}" fill="${paletteHex[shapeName]}" opacity="${opacity}"/>`
    }
  }

  const svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="${paletteHex[bgName]}"/>
      ${shapes}
    </svg>
  `

  return new Blob([svgMarkup], { type: 'image/svg+xml' })
}

function generateRandomFolderName() {
  const adjectives = ['Cozy', 'Hidden', 'Forgotten', 'Sunny', 'Quiet', 'Vivid', 'Lost', 'Ancient', 'Tiny', 'Glowing']
  const nouns      = ['Rooms', 'Archive', 'Sketches', 'Renders', 'Snapshots', 'Outtakes', 'Drafts', 'Memories', 'Backups', 'Scans']
  return `${randomItem(adjectives)} ${randomItem(nouns)}`
}

function populateRandomGallery(count = 50) {
  for (let index = 0; index < count; index++) {
    createFolderCard(
      generateRandomFolderName(),
      generateRandomCover(),
      randomItem(palette),
      Number(randomBetween(2, 600).toFixed(1)),
      Math.floor(randomBetween(1, 400))
    )
  }
}

populateRandomGallery(50)

initSortPill()

setupMarquee()
window.addEventListener('resize', () => setupMarquee())