// 1. detect action url
// 2. fetch metadata
// 3. render action button
//

interface ActionGetResponse {
    icon: string;
    title: string;
    description: string;
    label: string;
    disabled?: boolean;
    links?: {
        actions: LinkedAction[];
    };
    error?: ActionError;
}

interface LinkedAction {
    href: string;
    label: string;
    parameters?: ActionParameter;
}

interface ActionParameter {
    name: string;
    label?: string;
    required?: boolean;
}

interface ActionError {
    message: string;
}

const PROTOCOL_PREFIX = 'btc-action:';

const isDiscord = document.URL.includes('https://discord.com')

async function sha256(message: string) {
    // encode as UTF-8
    const msgBuffer = new TextEncoder().encode(message)

    // hash the message
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)

    // convert ArrayBuffer to Array
    const hashArray = Array.from(new Uint8Array(hashBuffer))

    // convert bytes to hex string
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
    return hashHex
}

const renderActions = async (actionUrl: string, element: Element) => {
    const res = await fetch(actionUrl)
    const resJson: ActionGetResponse = await res.json();

    const iconElem = document.createElement('img')
    iconElem.className = 'btc-action_icon'
    iconElem.src = resJson.icon
    iconElem.alt = 'action-image'

    const titleElem = document.createElement('div')
    titleElem.innerHTML = resJson.title
    titleElem.className = 'btc-action_title'

    const descElem = document.createElement('div')
    descElem.innerHTML = resJson.description

    const linksElem = document.createElement('div')
    linksElem.className = 'btc-action_links'
    if (resJson.links) {
        const { actions } = resJson.links
        for (let action of actions) {
            const btnElem = document.createElement('div')
            btnElem.className = 'btc-action_btn'
            btnElem.innerHTML = action.label
            btnElem.style.width = `${Math.floor(360 / resJson.links.actions.length)}px`
            linksElem.appendChild(btnElem)
            btnElem.onclick = async (e) => {
                e.preventDefault()
                e.stopPropagation()
                const res = await fetch(actionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    mode: 'no-cors'
                });
                console.log({ res })
                const resJson = await res.json();
                console.log({ resJson })
                alert(resJson.toString())
                // todo: call unisat to send tx
            }
        }
    }

    const actionElem = document.createElement('div')
    actionElem.className = 'btc-action_card'
    actionElem.appendChild(iconElem)
    actionElem.appendChild(titleElem)
    actionElem.appendChild(descElem)
    actionElem.appendChild(linksElem)

    element.parentNode?.appendChild(actionElem)
    element.remove()
}

const isValidElement = (tag: string, element: Element) => {
    if (tag === "code" && element.innerHTML.includes(PROTOCOL_PREFIX)) return true
    if (tag === "span" && element.textContent?.includes(PROTOCOL_PREFIX)) return true
    return false
}

const handleElement = async (tag: string, element: Element) => {
    try {
        const bal = tag === "code" ? element.innerHTML : element.textContent;
        if (!bal) return

        const url = bal?.split(PROTOCOL_PREFIX)[1]
        if (!url || url.length === 0) return

        const hash = await sha256(url)
        const newId = `bal-cs-${hash}`

        // already unfurled
        if (element.parentNode?.querySelector(`#${newId}`)) return

        console.log(`unfurl: ${url}`)
        /*
        const newIframe = document.createElement("iframe")
        const encodedEAL = encodeURIComponent(url.replaceAll("&amp;", "&"))

        newIframe.src = `chrome-extension://dkfjmmpblkmjonmaemcmngophheaolkh/tabs/eal.html?action=${encodedEAL}`
        newIframe.width = "430"
        newIframe.height = "430"
        // newIframe.style.backgroundColor = "white"
        newIframe.style.marginTop = "8px"
        newIframe.style.border = "none"

        element.parentNode?.appendChild(newIframe)
        element.remove()
        */

        renderActions(url, element)
        // element.remove()
    } catch (error) {
        console.error(error, "[Shortcut] Error")
    }
}

const searchElements = async (tag: string) => {
    const tags = document.querySelectorAll(tag)

    for (const element of tags) {
        if (isValidElement(tag, element)) {
            await handleElement(tag, element)
        }
    }
}

/*
chrome.tabs.onUpdated.addListener((tabId: any, changeInfo: any) => {
    if (changeInfo.status === 'complete') {
        console.log('complete')
        searchElements(isDiscord ? 'code' : 'span')
    }
})
*/

document.onreadystatechange = () => {
    if (document.readyState === 'complete') {
        setTimeout(() => {
            console.log('load')
            searchElements(isDiscord ? 'code' : 'span')
        }, 3000)
    }
}

//searchElements("code")
if (isDiscord) {
    document.addEventListener("mouseover", () => searchElements("code"))
} else {
    document.addEventListener("scroll", () => searchElements("span"))
}

