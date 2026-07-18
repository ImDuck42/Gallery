// ==================================================================================================== //
// CONFIGURATION & STATE
// ==================================================================================================== //
const ACCENT_NAMES = [
  'rosewater', 'flamingo', 'pink', 'mauve', 'red', 'maroon',
  'peach', 'yellow', 'green', 'teal', 'sky', 'sapphire', 'blue', 'lavender',
]

const ACCENT_HEX_COLORS = {
  rosewater: '#f5e0dc', flamingo: '#f2cdcd', pink: '#f5c2e7', mauve: '#cba6f7',
  red: '#f38ba8', maroon: '#eba0ac', peach: '#fab387', yellow: '#f9e2af',
  green: '#a6e3a1', teal: '#94e2d5', sky: '#89dceb', sapphire: '#74c7ec',
  blue: '#89b4fa', lavender: '#b4befe',
}

// Selector map
const SELECTORS = {
  folderGrid:      '.folder-grid',
  galleryMasonry:  '.gallery-masonry',
  chipContainer:   '.chip-container',
  fullScreenModal: '.full-screen',
  fullScreenImage: '.full-screen-img',
  contentPanel:    '.content',
  contentSections: '.content > div',
  filterPanel:     '.filter-panel',
  navPill:         '.nav-pill',
  navTab:          '.tab',
  sortPill:        '.sort-pill',
  sortSlider:      '.sort-slider',
  sortOption:      '.sort-option',
  searchIcon:      '.search-pill .fa-search',
  searchInput:     '.search-input',
  searchSubmit:    '.search-submit',
  imageCountLabel: '.image-count',
  folderTitle:     '.folder-title',
}

/**
 * Dataset schema used by folder cards and gallery cards so that
 * applyCurrentSort() and applyActiveFilters() can read them:
 *   data-name        -> sortable/searchable label (folder name, or image name)
 *   data-size        -> size in MB/bytes, used for size sorting
 *   data-date        -> synthetic creation timestamp, used for date sorting
 *   data-type        -> 'folder' or file extension, used for type sorting
 *   data-folder-name -> (gallery cards only) the folder an image belongs to
 */
const GALLERY_SERVER_URL = 'http://localhost:4269'

let activeFolderFilters = ['all']
let currentSearchQuery  = ''
let currentSort         = { key: 'name', direction: 'up' }
let cardSequenceNumber  = 0

let   allGalleryImages = []
let   filteredImages   = []
let   renderIndex      = 0
const BATCH_SIZE       = 100

// ==================================================================================================== //
// HELPERS
// ==================================================================================================== //
function pickValidAccent(accentName) {
  return ACCENT_NAMES.includes(accentName) ? accentName : 'mauve'
}

function applyAccentColor(card, accentName) {
  card.style.setProperty('--accent', `var(--ctp-${pickValidAccent(accentName)}-rgb)`)
}

function nextCardTimestamp() {
  cardSequenceNumber += 1
  return Date.now() - cardSequenceNumber * 1000
}

// ==================================================================================================== //
// DOM FUNCTIONS
// ==================================================================================================== //
function createFolderCard(folderName, previewUrl, accentName, sizeInMB, fileCount) {
  const gridContainer = document.querySelector(SELECTORS.folderGrid)
  if (!gridContainer) return

  const card        = document.createElement('div')
  card.className    = 'folder-card'
  card.dataset.name = folderName
  card.dataset.size = sizeInMB
  card.dataset.date = nextCardTimestamp()
  card.dataset.type = 'folder'
  applyAccentColor(card, accentName)

  card.innerHTML = `
    <div class="folder-tab">
      <span class="file-count">${fileCount} Files</span>
    </div>
    <div class="folder-body">
      <div class="folder-preview">
        <img loading="lazy" decoding="async" src="${previewUrl}" alt="${folderName} Preview">
      </div>
      <div class="folder-info">
        <h3 class="folder-title">
          <span>${folderName}</span>
        </h3>
        <span class="folder-size">${sizeInMB} MB</span>
      </div>
    </div>
  `

  card.addEventListener('click', () => {
    openFolderInGallery(folderName)
  })

  gridContainer.appendChild(card)
}

function openFolderInGallery(folderName) {
  const tabs   = document.querySelectorAll(`${SELECTORS.navPill} ${SELECTORS.navTab}`)
  const panels = document.querySelectorAll(SELECTORS.contentSections)
  const chip   = document.querySelector(`${SELECTORS.chipContainer} .chip[data-folder="${folderName}"]`)
  if (!chip) return

  const galleryPanelIndex = 1
  tabs.forEach((tab) => tab.classList.remove('active'))
  tabs[galleryPanelIndex].classList.add('active')
  panels.forEach((panel, panelIndex) => panel.classList.toggle('active', panelIndex === galleryPanelIndex))

  const searchInput = document.querySelector(SELECTORS.searchInput)
  if (searchInput) searchInput.value = ''
  currentSearchQuery = ''

  packAllGalleryCards()

  document.querySelectorAll(`${SELECTORS.chipContainer} .chip`).forEach((item) => item.classList.remove('active'))
  chip.classList.add('active')
  setActiveFolderFilter(folderName)
}

function renderNextBatch() {
  const gridContainer = document.querySelector(SELECTORS.galleryMasonry)
  if (!gridContainer || renderIndex >= filteredImages.length) return

  const fragment = document.createDocumentFragment()
  const end = Math.min(renderIndex + BATCH_SIZE, filteredImages.length)

  for (let index = renderIndex; index < end; index++) {
    const img  = filteredImages[index]
    const card = document.createElement('div')

    card.className                  = 'gallery-card'
    card.dataset.folderName         = img.folderName
    card.dataset.name               = img.name
    card.dataset.size               = img.size
    card.dataset.date               = img.date
    card.dataset.type               = img.type
    card.style.contentVisibility    = 'auto'
    card.style.containIntrinsicSize = '200px 300px'
    card.innerHTML                  = `<img loading="lazy" decoding="async" src="${img.url}" alt="${img.name}">`
    applyAccentColor(card, img.accent)

    const imageElement = card.querySelector('img')
    imageElement.addEventListener('load', () => packGalleryCard(card))

    fragment.appendChild(card)
  }

  gridContainer.appendChild(fragment)
  renderIndex = end
}

function initInfiniteScroll() {
  const contentPanel = document.querySelector(SELECTORS.contentPanel)
  if (!contentPanel) return

  contentPanel.addEventListener('scroll', () => {
    const isNearBottom = contentPanel.scrollHeight - contentPanel.scrollTop - contentPanel.clientHeight < 800
    if (isNearBottom) {
      requestAnimationFrame(() => renderNextBatch())
    }
  }, { passive: true })
}

// ==================================================================================================== //
// MASONRY GRID
// ==================================================================================================== //
function packGalleryCard(card) {
  const grid = document.querySelector(SELECTORS.galleryMasonry)
  const image = card.querySelector('img')
  if (!grid || !image || !image.naturalWidth) return

  const gridStyles   = getComputedStyle(grid)
  const rowHeight    = parseFloat(gridStyles.getPropertyValue('grid-auto-rows'))
  const rowGap       = parseFloat(gridStyles.getPropertyValue('gap'))
  const cardWidth    = card.getBoundingClientRect().width
  const scaledHeight = cardWidth * (image.naturalHeight / image.naturalWidth)

  const rowSpan         = Math.ceil((scaledHeight + rowGap) / (rowHeight + rowGap))
  card.style.gridRowEnd = `span ${rowSpan}`
}

function packAllGalleryCards() {
  document.querySelectorAll(`${SELECTORS.galleryMasonry} .gallery-card`).forEach(packGalleryCard)
}

// ==================================================================================================== //
// UI INTERACTIONS
// ==================================================================================================== //
function initFullScreenModal() {
  const modal      = document.querySelector(SELECTORS.fullScreenModal)
  const modalImage = modal?.querySelector(SELECTORS.fullScreenImage)
  const gallery    = document.querySelector(SELECTORS.galleryMasonry)
  if (!modal || !modalImage || !gallery) return

  const scaleModalImage = () => {
    const imageRatio    = modalImage.naturalWidth / modalImage.naturalHeight
    const viewportRatio = window.innerWidth / window.innerHeight

    if (imageRatio > viewportRatio) {
      modalImage.style.width  = '100%'
      modalImage.style.height = 'auto'
    } else {
      modalImage.style.height = '100%'
      modalImage.style.width  = 'auto'
    }
  }

  gallery.addEventListener('click', (event) => {
    const card  = event.target.closest('.gallery-card')
    const image = card?.querySelector('img')
    if (!image) return

    modalImage.onload = scaleModalImage
    modalImage.src = image.src
    modalImage.alt = image.alt

    modal.classList.add('active')
  })

  const closeModal = () => modal.classList.remove('active')

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal()
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('active')) closeModal()
  })
}

function initFilterPanelAutoHide() {
  const contentPanel = document.querySelector(SELECTORS.contentPanel)
  const filterPanel  = document.querySelector(SELECTORS.filterPanel)
  if (!contentPanel || !filterPanel) return

  let lastScrollTop = contentPanel.scrollTop

  contentPanel.addEventListener('scroll', () => {
    const currentScrollTop = contentPanel.scrollTop
    const scrollDelta = currentScrollTop - lastScrollTop

    if (currentScrollTop < 50) {
      filterPanel.classList.remove('hidden')
    } else if (scrollDelta > 5) {
      filterPanel.classList.add('hidden')
    } else if (scrollDelta < -5) {
      filterPanel.classList.remove('hidden')
    }

    lastScrollTop = currentScrollTop
  }, { passive: true })
}

function enableChipScrollInteractions() {
  const container = document.querySelector(SELECTORS.chipContainer)
  if (!container) return

  let targetScrollLeft    = container.scrollLeft
  let animationFrameId    = 0
  let isPointerDown       = false
  let hasDragged          = false
  let shouldSuppressClick = false
  let dragStartX          = 0
  let dragStartScrollLeft = 0

  const animateScrollStep = () => {
    const remainingDistance = targetScrollLeft - container.scrollLeft
    if (Math.abs(remainingDistance) > 0.5) {
      container.scrollLeft += remainingDistance * 0.15
      animationFrameId = requestAnimationFrame(animateScrollStep)
    } else {
      container.scrollLeft = targetScrollLeft
      animationFrameId = 0
    }
  }

  container.addEventListener('wheel', (event) => {
    if (isPointerDown || container.scrollWidth <= container.clientWidth) return
    if (!animationFrameId) targetScrollLeft = container.scrollLeft
    event.preventDefault()

    const maxScrollLeft = container.scrollWidth - container.clientWidth
    targetScrollLeft = Math.max(0, Math.min(targetScrollLeft + 0.5 * event.deltaY, maxScrollLeft))
    if (!animationFrameId) animationFrameId = requestAnimationFrame(animateScrollStep)
  }, { passive: false })

  container.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = 0
    }

    isPointerDown       = true
    hasDragged          = false
    shouldSuppressClick = false
    dragStartX          = event.clientX
    dragStartScrollLeft = container.scrollLeft
    targetScrollLeft    = dragStartScrollLeft
    container.classList.add('dragging')
  })

  window.addEventListener('pointermove', (event) => {
    if (!isPointerDown) return
    const dragDistance = event.clientX - dragStartX
    if (Math.abs(dragDistance) > 5) hasDragged = true

    const maxScrollLeft  = container.scrollWidth - container.clientWidth
    container.scrollLeft = Math.max(0, Math.min(dragStartScrollLeft - dragDistance, maxScrollLeft))
  })

  const endPointerDrag = () => {
    if (!isPointerDown) return
    isPointerDown = false
    container.classList.remove('dragging')
    targetScrollLeft = container.scrollLeft
    if (hasDragged) shouldSuppressClick = true
  }

  window.addEventListener('pointerup', endPointerDrag)
  window.addEventListener('pointercancel', endPointerDrag)

  container.addEventListener('click', (event) => {
    if (hasDragged || shouldSuppressClick) {
      event.preventDefault()
      event.stopPropagation()
      shouldSuppressClick = false
      hasDragged          = false
    }
  }, { capture: true })
}

function initSearchIconHover() {
  const icon = document.querySelector(SELECTORS.searchIcon)
  if (!icon) return

  const randomizeIconColor = () => {
    const accentName = ACCENT_NAMES[Math.floor(Math.random() * ACCENT_NAMES.length)]
    icon.style.color = `rgb(var(--ctp-${accentName}-rgb))`
  }

  icon.addEventListener('mouseenter', randomizeIconColor)
  icon.addEventListener('click',      randomizeIconColor)
}

function initSearchControls() {
  const input        = document.querySelector(SELECTORS.searchInput)
  const submitButton = document.querySelector(SELECTORS.searchSubmit)
  if (!input) return

  const submitSearch = () => {
    currentSearchQuery = input.value.trim().toLowerCase()
    applyActiveFilters()
  }

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submitSearch()
    }
  })

  input.addEventListener('input', () => {
    if (input.value.trim() === '') {
      submitSearch()
    }
  })

  submitButton?.addEventListener('click', (event) => {
    event.preventDefault()
    submitSearch()
  })
}

function toggleFilterChip(folderName, chip) {
  const chipContainer = document.querySelector(SELECTORS.chipContainer)
  if (!chipContainer) return

  const willBeActive = !chip.classList.contains('active')

  if (folderName === 'all') {
    chipContainer.querySelectorAll('.chip').forEach((item) => item.classList.remove('active'))
    if (willBeActive) chip.classList.add('active')
  } else {
    chipContainer.querySelector('.chip[data-folder="all"]')?.classList.remove('active')
    chip.classList.toggle('active')
  }

  activeFolderFilters = Array.from(chipContainer.querySelectorAll('.chip.active'))
    .map((activeChip) => activeChip.dataset.folder)

  applyActiveFilters()
}

function setActiveFolderFilter(folderName) {
  const chipContainer = document.querySelector(SELECTORS.chipContainer)
  if (!chipContainer) return

  chipContainer.querySelectorAll('.chip').forEach((item) => item.classList.remove('active'))
  chipContainer.querySelector(`.chip[data-folder="${folderName}"]`)?.classList.add('active')
  activeFolderFilters = [folderName]

  applyActiveFilters()
}

function applyActiveFilters() {
  const query         = currentSearchQuery.trim().toLowerCase()
  const chipContainer = document.querySelector(SELECTORS.chipContainer)
  const allChip       = chipContainer?.querySelector('.chip[data-folder="all"]')
  const folderChips   = Array.from(chipContainer?.querySelectorAll('.chip:not([data-folder="all"])') || [])
  
  const panels       = document.querySelectorAll(SELECTORS.contentSections)
  const isGalleryTab = panels.length > 1 && panels[1].classList.contains('active')

  folderChips.forEach((chip) => {
    const folderName = chip.dataset.folder || ''
    let chipMatchesQuery = !query
    
    if (query) {
      if (isGalleryTab) {
        chipMatchesQuery = allGalleryImages.some(img => img.folderName === folderName && img.name.toLowerCase().includes(query))
      } else {
        chipMatchesQuery = folderName.toLowerCase().includes(query)
      }
    }
    
    chip.style.display = chipMatchesQuery ? '' : 'none'
  })

  if (allChip) allChip.style.display = ''

  const visibleFolderNames = folderChips
    .filter((chip) => chip.style.display !== 'none')
    .map((chip)    => chip.dataset.folder)

  activeFolderFilters = activeFolderFilters.filter((folder) => folder === 'all' || visibleFolderNames.includes(folder))

  document.querySelectorAll(`${SELECTORS.folderGrid} .folder-card`).forEach((card) => {
    const folderName          = card.dataset.name || ''
    const matchesFolderFilter = isGalleryTab ? activeFolderFilters.includes('all') || activeFolderFilters.includes(folderName) : true
    const matchesQuery        = !query || [folderName, card.textContent].some((value) => (value || '').toLowerCase().includes(query))
    card.style.display        = matchesFolderFilter && matchesQuery ? '' : 'none'
  })

  filteredImages = allGalleryImages.filter((img) => {
    const matchesFolderFilter = activeFolderFilters.includes('all') || activeFolderFilters.includes(img.folderName)
    
    let matchesQuery = !query
    if (query) {
      if (isGalleryTab) {
        matchesQuery = img.name.toLowerCase().includes(query)
      } else {
        matchesQuery = [img.folderName, img.name].some((value) => value.toLowerCase().includes(query))
      }
    }
    
    return matchesFolderFilter && matchesQuery
  })

  updateImageCount(filteredImages.length)

  const gridContainer = document.querySelector(SELECTORS.galleryMasonry)
  if (gridContainer) gridContainer.innerHTML = ''
  
  renderIndex = 0
  renderNextBatch()
}

function updateImageCount(count) {
  const countLabel = document.querySelector(SELECTORS.imageCountLabel)
  if (countLabel) countLabel.textContent = `${count} Images`
}

function setupMarquee(root = document) {
  root.querySelectorAll(SELECTORS.folderTitle).forEach((title) => {
    const label = title.querySelector('span')
    if (!label) return

    if (label.scrollWidth > title.clientWidth) {
      title.classList.add('marquee')
      title.style.setProperty('--marquee-room', `${title.clientWidth}px`)
    } else {
      title.classList.remove('marquee')
      title.style.removeProperty('--marquee-room')
    }
  })
}

function initNavPill() {
  const pill = document.querySelector(SELECTORS.navPill)
  if (!pill) return

  const tabs   = pill.querySelectorAll(SELECTORS.navTab)
  const panels = document.querySelectorAll(SELECTORS.contentSections)

  const showPanel = (panelIndex) => {
    panels.forEach((panel, index) => panel.classList.toggle('active', index === panelIndex))
    if (panelIndex === 1) packAllGalleryCards()
  }

  tabs.forEach((tab, tabIndex) => {
    tab.addEventListener('click', (event) => {
      event.preventDefault()
      if (tab.classList.contains('active')) return

      tabs.forEach((item) => item.classList.remove('active'))
      tab.classList.add('active')

      const searchInput = document.querySelector(SELECTORS.searchInput)
      if (searchInput) searchInput.value = ''
      currentSearchQuery = ''

      showPanel(tabIndex)
      applyActiveFilters()
    })
  })

  const activeTabIndex = Array.from(tabs).findIndex((tab) => tab.classList.contains('active'))
  showPanel(activeTabIndex === -1 ? 0 : activeTabIndex)
}

function initSortPill() {
  const pill = document.querySelector(SELECTORS.sortPill)
  if (!pill) return

  const slider  = pill.querySelector(SELECTORS.sortSlider)
  const options = pill.querySelectorAll(SELECTORS.sortOption)

  const moveSlider = (option) => {
    slider.style.width     = `${option.offsetWidth}px`
    slider.style.transform = `translateX(${option.offsetLeft}px)`
  }

  const setSortArrow = (option, direction) => {
    if (option.dataset.sort === 'type') return
    const icon = option.querySelector('i')
    if (!icon) return

    icon.classList.remove('fa-arrow-up', 'fa-arrow-down')
    icon.classList.add(direction === 'down' ? 'fa-arrow-down' : 'fa-arrow-up')
  }

  options.forEach((option) => {
    option.addEventListener('click', () => {
      const wasActive      = option.classList.contains('active')
      const savedDirection = option.dataset.direction
      const direction      = wasActive ? (savedDirection === 'up' ? 'down' : 'up') : (savedDirection || 'up')

      options.forEach((item) => {
        item.classList.remove('active')
        if (item !== option) setSortArrow(item, item.dataset.direction || 'up')
      })

      option.classList.add('active')
      option.dataset.direction = direction
      currentSort = { key: option.dataset.sort, direction }
      setSortArrow(option, direction)
      moveSlider(option)
      applyCurrentSort()
    })
  })

  const activeOption = pill.querySelector(`${SELECTORS.sortOption}.active`)
  if (activeOption) {
    activeOption.dataset.direction = 'up'
    setSortArrow(activeOption, 'up')
    moveSlider(activeOption)
  }

  window.addEventListener('resize', () => {
    const currentOption = pill.querySelector(`${SELECTORS.sortOption}.active`)
    if (currentOption) moveSlider(currentOption)
  })
}

function compareByCurrentSort(itemA, itemB, valueOf) {
  if (currentSort.key === 'type') {
    return (Math.random() > 0.5 ? 1 : -1) * (currentSort.direction === 'up' ? 1 : -1)
  }

  const valueA = valueOf(itemA)
  const valueB = valueOf(itemB)

  const comparison = currentSort.key === 'size' || currentSort.key === 'date'
    ? (Number(valueA) || 0) - (Number(valueB) || 0)
    : String(valueA).localeCompare(String(valueB), undefined, { numeric: true, sensitivity: 'base' })

  return currentSort.direction === 'up' ? comparison : -comparison
}

function applyCurrentSort() {
  const folderGrid = document.querySelector(SELECTORS.folderGrid)
  if (folderGrid) {
    const cards = Array.from(folderGrid.querySelectorAll('.folder-card'))
    cards.sort((cardA, cardB) => compareByCurrentSort(cardA, cardB, (card) => card.dataset[currentSort.key] ?? ''))
    cards.forEach((card) => folderGrid.appendChild(card))
  }

  allGalleryImages.sort((imgA, imgB) => compareByCurrentSort(imgA, imgB, (img) => img[currentSort.key] ?? ''))

  applyActiveFilters()
}

function initGalleryFilters() {
  const allChip = document.querySelector('.chip[data-folder="all"]')
  allChip?.addEventListener('click', () => toggleFilterChip('all', allChip))
}

// ==================================================================================================== //
// FOLDER LOADING (via server.py on localhost:4269)
// ==================================================================================================== //
async function loadFoldersFromServer() {
  const manifestResponse = await fetch(`${GALLERY_SERVER_URL}/folders`)
  if (!manifestResponse.ok) throw new Error(`Manifest request failed: ${manifestResponse.status}`)

  const manifest      = await manifestResponse.json()
  const chipContainer = document.querySelector(SELECTORS.chipContainer)

  for (const folder of manifest) {
    const previewUrl = folder.images.length > 0 
        ? `${GALLERY_SERVER_URL}/image?folder=${encodeURIComponent(folder.name)}&file=${encodeURIComponent(folder.images[0].name)}`
        : ''

    createFolderCard(folder.name, previewUrl, folder.accent, folder.sizeMB, folder.fileCount)

    folder.images.forEach((img) => {
      allGalleryImages.push({
        folderName: folder.name,
        name:       img.name,
        size:       img.size,
        date:       nextCardTimestamp(),
        type:       (img.name.split('.').pop() || 'img').toLowerCase(),
        accent:     folder.accent,
        url:        `${GALLERY_SERVER_URL}/image?folder=${encodeURIComponent(folder.name)}&file=${encodeURIComponent(img.name)}`
      })
    })

    if (chipContainer) {
      const chip          = document.createElement('button')
      chip.className      = 'chip'
      chip.dataset.folder = folder.name
      chip.innerHTML      = `<span>${folder.name}</span>`
      chip.addEventListener('click', () => toggleFilterChip(folder.name, chip))
      chipContainer.appendChild(chip)
    }
  }

  applyCurrentSort()
}

// ==================================================================================================== //
// INIT
// ==================================================================================================== //
document.addEventListener('DOMContentLoaded', async () => {
  initFilterPanelAutoHide()
  initNavPill()
  initSortPill()
  initGalleryFilters()
  initSearchControls()
  initSearchIconHover()
  initFullScreenModal()
  enableChipScrollInteractions()
  initInfiniteScroll()

  try {
    await loadFoldersFromServer()
  } catch (error) {}

  setupMarquee()

  window.addEventListener('resize', () => {
    setupMarquee()
    packAllGalleryCards()
  })
})