// ========================================================================== //
// CONFIGURATION
// ========================================================================== //
const ACCENTS = [
  'rosewater', 'flamingo', 'pink', 'mauve', 'red', 'maroon',
  'peach', 'yellow', 'green', 'teal', 'sky', 'sapphire', 'blue', 'lavender'
]

const HEX_COLORS = {
  rosewater: '#f5e0dc', flamingo: '#f2cdcd', pink: '#f5c2e7', mauve: '#cba6f7',
  red: '#f38ba8', maroon: '#eba0ac', peach: '#fab387', yellow: '#f9e2af',
  green: '#a6e3a1', teal: '#94e2d5', sky: '#89dceb', sapphire: '#74c7ec',
  blue: '#89b4fa', lavender: '#b4befe'
}

// ========================================================================== //
// DOM FUNCTIONS
// ========================================================================== //
function createFolderCard(name, previewImage, accentName, sizeMB, fileCount) {
  if (!ACCENTS.includes(accentName)) accentName = 'mauve'

  const gridContainer = document.querySelector('.folder-grid')
  if (!gridContainer) return

  const imageUrl = URL.createObjectURL(previewImage)
  const card     = document.createElement('div')
  
  card.className = 'folder-card'
  card.style.setProperty('--accent', `var(--ctp-${accentName}-rgb)`)

  card.innerHTML = `
    <div class="folder-tab">
      <span class="file-count">${fileCount} Files</span>
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

  card.addEventListener('click', () => {
    setTimeout(() => {
      openFolderInGallery(name)
    }, 100) // let animation play out
  })

  gridContainer.appendChild(card)
}

function openFolderInGallery(folderName) {
  const tabs   = document.querySelectorAll('.nav-pill .tab')
  const panels = document.querySelectorAll('.content > div')
  const chip   = document.querySelector(`.chip-container .chip[data-folder="${folderName}"]`)

  if (!chip) return

  const galleryIndex = 1
  tabs.forEach(tab => tab.classList.remove('active'))
  tabs[galleryIndex].classList.add('active')
  panels.forEach((panel, idx) => panel.classList.toggle('active', idx === galleryIndex))
  packAllGalleryCards()

  document.querySelectorAll('.chip-container .chip').forEach(item => item.classList.remove('active'))
  chip.classList.add('active')
  applyGalleryFilter()
}

function loadGalleryFolder(folderName, imageList) {
  const gridContainer = document.querySelector('.gallery-masonry')
  const chipContainer = document.querySelector('.chip-container')

  if (!gridContainer || !chipContainer) return

  imageList.forEach(img => {
    const accentName = ACCENTS.includes(img.accent) ? img.accent : 'mauve'
    const imageUrl   = URL.createObjectURL(img.file)
    const card       = document.createElement('div')
    
    card.className      = 'gallery-card'
    card.dataset.folder = folderName
    card.style.setProperty('--accent', `var(--ctp-${accentName}-rgb)`)
    card.innerHTML      = `<img src="${imageUrl}" alt="${img.name}">`

    card.addEventListener('click', () => {
      openFullScreen(imageUrl, img.name);
    });

    const image = card.querySelector('img')
    image.addEventListener('load', () => {
      URL.revokeObjectURL(imageUrl)
      packGalleryCard(card)
    })

    gridContainer.appendChild(card)
  })

  const existingChip = Array.from(chipContainer.querySelectorAll('.chip'))
    .find(chip => chip.dataset.folder === folderName)

  if (!existingChip) {
    const chip = document.createElement('button')
    chip.className      = 'chip'
    chip.dataset.folder = folderName
    chip.innerHTML      = `<span>${folderName}</span>`
    
    chip.addEventListener('click', () => toggleFilterChip(folderName, chip))
    chipContainer.appendChild(chip)
  }

  updateImageCount()
}

// ========================================================================== //
// MASONRY GRID
// ========================================================================== //
function packGalleryCard(card) {
  const grid  = document.querySelector('.gallery-masonry')
  const image = card.querySelector('img')
  if (!grid || !image || !image.naturalWidth) return

  const styles    = getComputedStyle(grid)
  const rowSize   = parseFloat(styles.getPropertyValue('grid-auto-rows'))
  const rowGap    = parseFloat(styles.getPropertyValue('gap'))
  const cardWidth = card.getBoundingClientRect().width
  const height    = cardWidth * (image.naturalHeight / image.naturalWidth)

  const span = Math.ceil((height + rowGap) / (rowSize + rowGap))
  card.style.gridRowEnd = `span ${span}`
}

function packAllGalleryCards() {
  document.querySelectorAll('.gallery-masonry .gallery-card').forEach(packGalleryCard)
}

// ========================================================================== //
// UI INTERACTIONS
// ========================================================================== //
function initFullScreenModal() {
  const modal    = document.querySelector('.full-screen')
  const modalImg = modal?.querySelector('.full-screen-img')
  const gallery  = document.querySelector('.gallery-masonry')
  
  if (!modal || !modalImg || !gallery) return

  const applyScaling = () => {
    const imgRatio  = modalImg.naturalWidth / modalImg.naturalHeight
    const viewRatio = window.innerWidth     / window.innerHeight

    if (imgRatio > viewRatio) {
      modalImg.style.width  = '100%'
      modalImg.style.height = 'auto'
    } else {
      modalImg.style.height = '100%'
      modalImg.style.width  = 'auto'
    }
  }

  gallery.addEventListener('click', (event) => {
    const card = event.target.closest('.gallery-card')
    if (!card) return

    const img = card.querySelector('img')
    if (img) {
      modalImg.onload = applyScaling
      modalImg.src    = img.src
      modalImg.alt    = img.alt
      
      setTimeout(() => {
        modal.classList.add('active')
      }, 75) // let animation play out
    }
  })

  const closeModal = () => {
    modal.classList.remove('active') 
  }

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal()
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('active')) {
      closeModal()
    }
  })
}

function initFilterPanelAutoHide() {
	const contentEl   = document.querySelector('.content')
	const filterPanel = document.querySelector('.filter-panel')
	let lastScrollY   = contentEl.scrollTop

	contentEl.addEventListener('scroll', () => {
		const currentY = contentEl.scrollTop
		const delta    = currentY - lastScrollY

		if (currentY < 50) {
			filterPanel.classList.remove('hidden')
		} else if (delta > 5) {
			filterPanel.classList.add('hidden')
		} else if (delta < -5) {
			filterPanel.classList.remove('hidden')
		}

		lastScrollY = currentY
	}, { passive: true })
}

function enableChipScrollInteractions() {
  const container = document.querySelector('.chip-container')
  if (!container) return

  let target        = container.scrollLeft
  let animationId   = 0
  let isDown        = false
  let didDrag       = false
  let suppressClick = false
  let startX        = 0
  let startScroll   = 0

  const tick = () => {
    const delta = target - container.scrollLeft
    if (Math.abs(delta) > 0.5) {
      container.scrollLeft += delta * 0.15
      animationId = requestAnimationFrame(tick)
    } else {
      container.scrollLeft = target
      animationId = 0
    }
  }

  container.addEventListener('wheel', (event) => {
    if (isDown || container.scrollWidth <= container.clientWidth) return
    if (!animationId) target             = container.scrollLeft
    event.preventDefault()

    const max = container.scrollWidth - container.clientWidth
    target = Math.max(0, Math.min(target + 0.5 * event.deltaY, max))
    if (!animationId) animationId = requestAnimationFrame(tick)
  }, { passive: false })

  container.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    if (animationId) cancelAnimationFrame(animationId), animationId = 0

    isDown        = true
    didDrag       = false
    suppressClick = false
    startX        = event.clientX
    startScroll   = container.scrollLeft
    target        = startScroll
    container.classList.add('dragging')
  })

  window.addEventListener('pointermove', (event) => {
    if (!isDown) return
    const delta = event.clientX - startX
    if (Math.abs(delta) > 5) didDrag = true

    const max = container.scrollWidth - container.clientWidth
    container.scrollLeft = Math.max(0, Math.min(startScroll - delta, max))
  })

  const endDrag = () => {
    if (!isDown) return
    isDown = false
    container.classList.remove('dragging')
    target = container.scrollLeft

    if (didDrag) {
      suppressClick = true
    }
  }

  window.addEventListener('pointerup',     endDrag)
  window.addEventListener('pointercancel', endDrag)

  container.addEventListener('click', (event) => {
    if (didDrag || suppressClick) {
      event.preventDefault()
      event.stopPropagation()
      suppressClick = false
      didDrag       = false
    }
  }, { capture: true })
}

function initSearchIconHover() {
  const icon = document.querySelector('.search-pill .fa-search')
  if (!icon) return

  'mouseenter, click'.split(',').forEach(event => {
    icon.addEventListener(event.trim(), () => {
      const accentName = ACCENTS[Math.floor(Math.random() * ACCENTS.length)]
      icon.style.color = `rgb(var(--ctp-${accentName}-rgb))`
    })
  })
}

function toggleFilterChip(folder, chip) {
  const chipContainer = document.querySelector('.chip-container')

  if (folder === 'all') {
    chipContainer.querySelectorAll('.chip:not([data-folder="all"])').forEach(item => item.classList.remove('active'))
    chip.classList.toggle('active')
  } else {
    chip.classList.toggle('active')
    chipContainer.querySelector('.chip[data-folder="all"]').classList.remove('active')
  }

  applyGalleryFilter()
}

function applyGalleryFilter() {
  const chipContainer = document.querySelector('.chip-container')
  const activeFolders  = Array.from(chipContainer.querySelectorAll('.chip.active'))
    .map(chip => chip.dataset.folder)

  let visibleCount = 0
  document.querySelectorAll('.gallery-masonry .gallery-card').forEach(card => {
    const show = activeFolders.includes('all') || activeFolders.includes(card.dataset.folder)
    card.style.display = show ? 'block' : 'none'
    if (show) visibleCount++
  })

  updateImageCount(visibleCount)
}

function updateImageCount(count) {
  const countLabel = document.getElementById('image-count')
  if (!countLabel) return

  if (count === undefined) {
    count = Array.from(document.querySelectorAll('.gallery-masonry .gallery-card'))
      .filter(card => card.style.display !== 'none').length
  }
  
  countLabel.textContent = `${count} Images`
}

function setupMarquee(root = document) {
  root.querySelectorAll('.folder-title').forEach(title => {
    const span = title.querySelector('span')
    if (span && span.scrollWidth > title.clientWidth) {
      title.classList.add('marquee')
      title.style.setProperty('--marquee-room', title.clientWidth + 'px')
    } else {
      title.classList.remove('marquee')
      title.style.removeProperty('--marquee-room')
    }
  })
}

function initNavPill() {
  const pill = document.querySelector('.nav-pill')
  if (!pill) return

  const tabs   = pill.querySelectorAll('.tab')
  const panels = document.querySelectorAll('.content > div')

  function showPanel(index) {
    panels.forEach((panel, idx) => panel.classList.toggle('active', idx === index))
    if (index === 1) packAllGalleryCards()
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', event => {
      event.preventDefault()
      if (tab.classList.contains('active')) return

      tabs.forEach(item => item.classList.remove('active'))
      tab.classList.add('active')
      showPanel(index)
    })
  })

  const activeIndex = Array.from(tabs).findIndex(tab => tab.classList.contains('active'))
  showPanel(activeIndex === -1 ? 0 : activeIndex)
}

function initSortPill() {
  const pill = document.querySelector('.sort-pill')
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

  options.forEach(option => {
    option.addEventListener('click', () => {
      const wasActive = option.classList.contains('active')
      const saved     = option.dataset.direction
      const direction = wasActive ? (saved === 'up' ? 'down' : 'up') : (saved || 'up')

      options.forEach(item => {
        item.classList.remove('active')
        if (item !== option) setArrow(item, item.dataset.direction || 'up')
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

  window.addEventListener('resize', () => {
    const current = pill.querySelector('.sort-option.active')
    if (current) moveSlider(current)
  })
}

function initGalleryFilters() {
  const allImagesChip = document.querySelector('.chip[data-folder="all"]')
  if (allImagesChip) {
    allImagesChip.addEventListener('click', function() {
      toggleFilterChip('all', this)
    })
  }
}

// ========================================================================== //
// MOCK DATA GENERATION
// ========================================================================== //
const MockGen = {
  num:   (min, max) => Math.random() * (max - min) + min,
  int:   (min, max) => Math.floor(MockGen.num(min, max)),
  item:  (list)     => list[MockGen.int(0, list.length)],
  
  folderName: () => {
    const adjectives = ['Cozy', 'Hidden', 'Forgotten', 'Sunny', 'Quiet', 'Vivid', 'Lost', 'Ancient', 'Tiny', 'Glowing']
    const nouns      = ['Rooms', 'Archive', 'Sketches', 'Renders', 'Snapshots', 'Outtakes', 'Drafts', 'Memories', 'Backups']
    return `${MockGen.item(adjectives)} ${MockGen.item(nouns)}`
  },

  imageName: () => {
    const prefixes = ['IMG', 'DSC', 'SCAN', 'RENDER', 'EXPORT']
    return `${MockGen.item(prefixes)}_${MockGen.int(1000, 9999)}.svg`
  },

  svgImage: () => {
    const width  = 400
    const height = MockGen.int(100, 560)
    const bgHex  = HEX_COLORS[MockGen.item(ACCENTS)]
    const shapesCount = MockGen.int(3, 8)
    
    let shapes = ''
    for (let i = 0; i < shapesCount; i++) {
      const color   = HEX_COLORS[MockGen.item(ACCENTS)]
      const opacity = MockGen.num(0.3, 0.85).toFixed(2)
      const type    = MockGen.item(['circle', 'rect', 'poly'])

      if (type === 'circle') {
        shapes += `<circle cx="${MockGen.num(0, width)}" cy="${MockGen.num(0, height)}" r="${MockGen.num(20, 90)}" fill="${color}" opacity="${opacity}"/>`
      } else if (type === 'rect') {
        const size = MockGen.num(40, 140)
        shapes += `<rect x="${MockGen.num(0, width)}" y="${MockGen.num(0, height)}" width="${size}" height="${size}" fill="${color}" opacity="${opacity}" transform="rotate(${MockGen.num(0, 360)} ${width/2} ${height/2})"/>`
      } else {
        const p1 = `${MockGen.num(0, width)},${MockGen.num(0, height)}`
        const p2 = `${MockGen.num(0, width)},${MockGen.num(0, height)}`
        const p3 = `${MockGen.num(0, width)},${MockGen.num(0, height)}`
        shapes += `<polygon points="${p1} ${p2} ${p3}" fill="${color}" opacity="${opacity}"/>`
      }
    }

    const svgMarkup = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
        <defs>
          <clipPath id="canvas-clip">
            <rect width="${width}" height="${height}" />
          </clipPath>
        </defs>
        <rect width="100%" height="100%" fill="${bgHex}"/>
        <g clip-path="url(#canvas-clip)">
          ${shapes}
        </g>
      </svg>
    `.trim()

    return new Blob([svgMarkup], { type: 'image/svg+xml' })
  }
}

function populateMockData(folderCount = 6) {
  for (let i = 0; i < folderCount; i++) {
    const imageCount = MockGen.int(5, 18)
    const folderName = `${MockGen.folderName()} ${imageCount}`
    
    createFolderCard(
      folderName,
      MockGen.svgImage(),
      MockGen.item(ACCENTS),
      Number(MockGen.num(10, 500).toFixed(1)),
      imageCount
    )

    const folderImages = Array.from({ length: imageCount }, () => ({
      name:   MockGen.imageName(),
      file:   MockGen.svgImage(),
      accent: MockGen.item(ACCENTS)
    }))

    loadGalleryFolder(folderName, folderImages)
  }
}

// ========================================================================== //
// INIT
// ========================================================================== //
document.addEventListener('DOMContentLoaded', () => {
  populateMockData(50)

  initFilterPanelAutoHide()
  initNavPill()
  initSortPill()
  initGalleryFilters()
  initSearchIconHover()
  initFullScreenModal()
  
  setupMarquee()
  enableChipScrollInteractions();
  window.addEventListener('resize', () => {
    setupMarquee()
    packAllGalleryCards()
  })
})