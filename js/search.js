window.addEventListener('DOMContentLoaded', () => {
  let isfetched = false, wait = false
  let datas
  const path = config.root + config.path
  const input = document.getElementById('search-input')
  fetch(path)
    .then(response => response.text())
    .then(res => {
      isfetched = true
      datas = JSON.parse(res)
      if (wait === true) {
        inputEventFunction()
      }
    })
  function getIndexByWord(word, text, caseSensitive) {
    let wordLen = word.length
    if (wordLen === 0) return []
    let startPosition = 0
    let position = []
    let index = []
    if (!caseSensitive) {
      text = text.toLowerCase()
      word = word.toLowerCase()
    }
    while ((position = text.indexOf(word, startPosition)) > -1) {
      index.push({
        position: position,
        word: word
      })
      startPosition = position + wordLen
    }
    return index
  }
  function mergeIntoSlice(start, end, index, searchText) {
    let item = index[index.length - 1]
    let position = item.position
    let word = item.word
    let hits = []
    let searchTextCountInSlice = 0
    while (position + word.length <= end && index.length !== 0) {
      if (word === searchText) {
        searchTextCountInSlice++
      }
      hits.push({
        position: position,
        length: word.length
      })
      let wordEnd = position + word.length
      index.pop()
      while (index.length !== 0) {
        item = index[index.length - 1]
        position = item.position
        word = item.word
        if (wordEnd > position) {
          index.pop()
        } else {
          break
        }
      }
    }
    return {
      hits: hits,
      start: start,
      end: end,
      TextCount: searchTextCountInSlice
    }
  }
  function highlightKeyword(text, slice) {
    let result = ''
    let prevEnd = slice.start
    slice.hits.forEach(hit => {
      result += text.substring(prevEnd, hit.position)
      let end = hit.position + hit.length
      result += `<nobr class="search-keyword">${text.substring(hit.position, end)}</nobr>`
      prevEnd = end
    })
    result += text.substring(prevEnd, slice.end)
    return result
  }
  function inLoading() {
    document.querySelector('.search-popup').innerHTML = '<div id="loading"><p>Loading...</p></div>'
  }
  function onPopupClose() {
    if (document.querySelector('.up') && document.querySelector('.closed')) {
      document.querySelector('.navBtn').classList.remove('expanded')
    }
    if (window.innerWidth > 1023) {
      document.body.classList.remove('blur')
    }
    document.querySelector('.search-popup').classList.remove('open')
  }
  function proceedSearch() {
    if (window.innerWidth > 1023) {
      document.body.classList.add('blur')
    }
    if (document.querySelector('.up') && document.querySelector('.closed')) {
      document.querySelector('.navBtn').classList.add('expanded')
    }
    document.querySelector('.search-popup').classList.add('open')
    if (isfetched === true) {
      document.querySelector('.search-popup').innerHTML = "<div id='search-result'></div>"
      document.getElementById('search-result').innerHTML = ''
    } else {
      inLoading()
    }
  }
  function inputEventFunction() {
    proceedSearch()
    if (isfetched === false) {
      wait = true
      inLoading()
      return
    }
    let searchText = input.value.trim().toLowerCase()
    if (!searchText.length) {
      document.querySelector('#search-input').placeholder = '键入以进行'
      onPopupClose()
      return
    }
    let keywords = searchText.split(/[-\s]+/)
    if (keywords.length > 1) {
      keywords.push(searchText)
    }
    let resultItems = []
    if (searchText.length > 0) {
      datas.forEach(data => {
        if (!data.title)
          return
        let TextCount = 0, TitleCount = 0, ContentCount = 0
        let title = data.title.trim()
        let titleInLowerCase = title.toLowerCase()
        let content = data.content ? data.content.trim().replace(/<[^>]+>/g, '') : ''
        let contentInLowerCase = content.toLowerCase()
        let articleUrl = decodeURIComponent(data.url).replace(/\/{2,}/g, '/')
        let indexOfTitle = []
        let indexOfContent = []
        keywords.forEach(keyword => {
          let hitInTitle = getIndexByWord(keyword, titleInLowerCase, false)
          let hitInContent = getIndexByWord(keyword, contentInLowerCase, false)
          indexOfTitle = indexOfTitle.concat(hitInTitle)
          indexOfContent = indexOfContent.concat(hitInContent)
          if (hitInTitle.length > 0 || hitInContent.length > 0) {
            TextCount++
          }
          if (hitInTitle.length > 0) {
            TitleCount++
          }
          if (hitInTitle.length > 0 || hitInContent.length > 0) {
            ContentCount++
          }
        })
        if (indexOfTitle.length > 0 || indexOfContent.length > 0) {
          [indexOfTitle, indexOfContent].forEach(index => {
            index.sort((itemLeft, itemRight) => {
              if (itemRight.position !== itemLeft.position) {
                return itemRight.position - itemLeft.position
              }
              return itemLeft.word.length - itemRight.word.length
            })
          })

          let slicesOfTitle = []
          let slicesOfContent = []
          if (indexOfTitle.length !== 0) {
            let tmp = mergeIntoSlice(0, title.length, indexOfTitle, searchText)
            slicesOfTitle.push(tmp)
          }
          let upperBound = parseInt(config.top_n_per_article, 10)
          if (upperBound >= 0) {
            slicesOfContent = slicesOfContent.slice(0, upperBound)
          }
          let resultItem = ''
          if (slicesOfTitle.length !== 0) {
            resultItem += `<a href="${articleUrl}" class="recent-post"><b class="search-result-title">${highlightKeyword(title, slicesOfTitle[0])}</b>`
          } else {
            resultItem += `<a href="${articleUrl}" class="recent-post"><b class="search-result-title">${title}</b>`
          }
          if (indexOfContent !== null && indexOfContent.length !== 0) {
            let item = indexOfContent[indexOfContent.length - 1]
            let position = item.position
            let word = item.word
            let start = position - 20
            let end = position + 80
            if (start < 0) {
              start = 0
            }
            if (end < position + word.length) {
              end = position + word.length
            }
            if (end > content.length) {
              end = content.length
            }
            let tmp = mergeIntoSlice(start, end, indexOfContent, searchText)
            resultItem += `<p class="search-result">${highlightKeyword(content, tmp)}...</p>`
          } else {
            resultItem += `<p class="search-result">${content}...</p>`
          }
          resultItem += '</a>'
          resultItems.push({
            item: resultItem,
            TextCount: TextCount,
            TitleCount: TitleCount,
            ContentCount: ContentCount,
            id: resultItems.length
          })
        }
      })
    }
    var resultContent = document.getElementById('search-result')
    if (resultItems.length === 0) {
      resultContent.innerHTML = `<div id="no-result"><p>无“<b>${input.value}</b>”相关数据</p></div>`
    } else {
      resultItems.sort((Left, Right) => {
        if (Left.TextCount !== Right.TextCount) {
          return Right.TextCount - Left.TextCount
        } else if (Left.TitleCount !== Right.TitleCount) {
          return Right.TitleCount - Left.TitleCount
        } else if (Left.ContentCount !== Right.ContentCount) {
          return Right.ContentCount - Left.ContentCount
        }
        return Right.id - Left.id
      })
      let searchResultList = ""
      resultItems.forEach(result => {
        searchResultList += result.item
      })
      resultContent.innerHTML = searchResultList
    }
    if (typeof pjax !== 'undefined') {
      pjax.refresh(resultContent)
    }
  }
  input.addEventListener('keypress', event => {
    if (event.key === 13) {
      inputEventFunction()
    }
  })
  function StartSearch() {
    document.querySelector('.navContent').classList.add('search')
    header.closeAll()
    document.querySelector('#search-input').placeholder = '键入以进行'
    if (isfetched === false) {
      inLoading()
    }
  }
  function EscapeSearch() {
    document.querySelector('#search-input').value = ''
    document.querySelector('.navContent').classList.remove('search')
    document.removeEventListener('mouseup', EscapeSearch)
    wait = false
    document.querySelector('.navContent').classList.remove('search')
    document.querySelector('.navContent').classList.add('moved')
    onPopupClose()
  }
  document.querySelector('#search-input').addEventListener('keyup', () => {
    document.querySelector('.navContent').classList.add('search')
    document.querySelector('.navContent').classList.remove('moved')
    inputEventFunction()
  })
  document.querySelector('#search-input').addEventListener('focus', () => {
    StartSearch()
  })
  document.querySelector('#search-input').addEventListener('blur', () => {
    document.querySelector('#search-input').placeholder = '搜索'
    document.querySelector('.navContent').classList.remove('search')
    document.querySelector('.navContent').classList.add('moved')
    document.addEventListener('mouseup', EscapeSearch)
  })
  window.addEventListener('keyup', event => {
    if (event.key === 'Escape') {
      EscapeSearch()
    }
  })
})
