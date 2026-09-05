import { sb, signIn, signOut, getSession,
         loadSettings, saveSettings,
         loadItems, upsertItem, setBuyRate,
         loadClients, upsertClient, upsertCard,
         loadBills, saveBill,
         loadOrders, updateOrderStatus,
         loadCustomers, createCsmCustomer, setCustomerActive, linkCustomerToClient,
         loadCustomerAddresses, adminSaveAddress, adminDeleteAddress,
         loadOffers, upsertOffer, deleteOffer } from './db.js'
import { parseList } from './parser.js'
import { S, CATS, today, uuid4, money, money0, dmy, addDays, addMonths,
         blankLine, blankDraft, rateFor, buyFor, calcTotals, activeCard } from './state.js'
import { itemsView, clientsView, histView, setupView, ordersView, customersView, offersView,
         buildBillPrint, buildCardPrint, cardTextWA, buyListTextWA,
         inWords,
         setIAsOn, setICat, setIQ, setOpenClient, setCQ, setCardSel, setAsOn,
         iAsOn, iCat, iQ, openClient, cQ, cardSel, asOn,
         setOStatus, setOQ, setCustQ, setCustOpen, setCsmForm, setCustAddrs, custOpen, custAddrs,
         setOfferForm } from './views.js'

/* ── seed data ── */
const SEED_ITEMS = [{"name":"Red Tomato Big","unit":"KG","buy":28,"sell":35,"cat":"Other"},{"name":"Potato Big","unit":"KG","buy":20,"sell":26,"cat":"Other"},{"name":"Potato Baby","unit":"KG","buy":42,"sell":42,"cat":"Indian Veg"},{"name":"Onion Big","unit":"KG","buy":20,"sell":26,"cat":"Other"},{"name":"Sambar Onion","unit":"KG","buy":116,"sell":125,"cat":"Other"},{"name":"Garlic Hole","unit":"KG","buy":140,"sell":150,"cat":"Indian Veg"},{"name":"Garlic Peeled","unit":"KG","buy":178,"sell":210,"cat":"Other"},{"name":"Ginger","unit":"KG","buy":140,"sell":190,"cat":"Indian Veg"},{"name":"Coconut Fresh","unit":"PC","buy":40,"sell":45,"cat":"Other"},{"name":"Coriander Leaves","unit":"KG","buy":90,"sell":117,"cat":"Leafy Veg"},{"name":"Curry Leaf","unit":"KG","buy":30,"sell":100,"cat":"Leafy Veg"},{"name":"Mint Leaves","unit":"KG","buy":100,"sell":130,"cat":"Other"},{"name":"Microgreen","unit":"PACK","buy":120,"sell":160,"cat":"Exotic Veg"},{"name":"Chilli Green","unit":"KG","buy":50,"sell":90,"cat":"Indian Veg"},{"name":"Chilli Red","unit":"KG","buy":30,"sell":100,"cat":"Other"},{"name":"Capsicum Green","unit":"KG","buy":40,"sell":70,"cat":"Indian Veg"},{"name":"Capsicum Yellow","unit":"KG","buy":140,"sell":300,"cat":"Exotic Veg"},{"name":"Capsicum Red","unit":"KG","buy":140,"sell":300,"cat":"Exotic Veg"},{"name":"Cabbage Green","unit":"KG","buy":36,"sell":36,"cat":"Other"},{"name":"Cabbage Red","unit":"KG","buy":121,"sell":140,"cat":"Exotic Veg"},{"name":"Cabbage Chinese","unit":"KG","buy":131,"sell":135,"cat":"Exotic Veg"},{"name":"Cucumber","unit":"KG","buy":35,"sell":50,"cat":"Indian Veg"},{"name":"Cherry Tomato","unit":"KG","buy":190,"sell":205,"cat":"Exotic Veg"},{"name":"Zucchini Green","unit":"KG","buy":170,"sell":220,"cat":"Exotic Veg"},{"name":"Spinach  / Palak","unit":"KG","buy":90,"sell":100,"cat":"Other"},{"name":"Spring Onion","unit":"KG","buy":120,"sell":166.67,"cat":"Leafy Veg"},{"name":"Zucchini Yellow","unit":"KG","buy":170,"sell":220,"cat":"Exotic Veg"},{"name":"Baby Corn Pealed","unit":"KG","buy":152,"sell":180,"cat":"Other"},{"name":"French Beans","unit":"KG","buy":120,"sell":150,"cat":"Indian Veg"},{"name":"Red Carrot","unit":"KG","buy":48,"sell":62,"cat":"Other"},{"name":"Raw Jack Fruit","unit":"KG","buy":90,"sell":200,"cat":"Other"},{"name":"Cauliflower","unit":"KG","buy":32.5,"sell":60,"cat":"Indian Veg"},{"name":"Lotus Root","unit":"KG","buy":180,"sell":200,"cat":"Other"},{"name":"Lady Finger","unit":"KG","buy":40,"sell":52,"cat":"Indian Veg"},{"name":"Lemon Yellow","unit":"KG","buy":170,"sell":221,"cat":"Other"},{"name":"Fresh Mushroom","unit":"KG","buy":190,"sell":247,"cat":"Other"},{"name":"Yam Root","unit":"KG","buy":40,"sell":91,"cat":"Other"},{"name":"Beetroot","unit":"KG","buy":30,"sell":40,"cat":"Indian Veg"},{"name":"Broccoli","unit":"KG","buy":133,"sell":190,"cat":"Exotic Veg"},{"name":"Bok Choy","unit":"KG","buy":172,"sell":196,"cat":"Exotic Veg"},{"name":"Celery Pata","unit":"KG","buy":192,"sell":248,"cat":"Other"},{"name":"Bajji Chilly","unit":"KG","buy":56,"sell":66,"cat":"Other"},{"name":"Radish White","unit":"KG","buy":21,"sell":30,"cat":"Other"},{"name":"Radish Red","unit":"KG","buy":174,"sell":280,"cat":"Other"},{"name":"Raw Papaya","unit":"KG","buy":33,"sell":40,"cat":"Indian Veg"},{"name":"Raw Mango","unit":"KG","buy":60,"sell":90,"cat":"Indian Veg"},{"name":"Thyme Fresh","unit":"KG","buy":350,"sell":400,"cat":"Other"},{"name":"Parsley Fresh","unit":"KG","buy":200,"sell":300,"cat":"Other"},{"name":"Basil Fresh","unit":"KG","buy":170,"sell":250,"cat":"Other"},{"name":"Lemon Grass","unit":"KG","buy":188,"sell":235,"cat":"Exotic Veg"},{"name":"Thai Ginger","unit":"KG","buy":270,"sell":450,"cat":"Other"},{"name":"Dill Leaves","unit":"BUNCH","buy":300,"sell":360,"cat":"Leafy Veg"},{"name":"Avocado","unit":"KG","buy":256,"sell":584,"cat":"Other"},{"name":"Pomegranate","unit":"KG","buy":174,"sell":390,"cat":"Other"},{"name":"Pineapple","unit":"PC","buy":100,"sell":111,"cat":"Fresh Fruits"},{"name":"Misc","unit":"KG","buy":400,"sell":520,"cat":"Other"},{"name":"Raw Banana","unit":"KG","buy":91,"sell":118.5,"cat":"Indian Veg"},{"name":"Califlower","unit":"KG","buy":50,"sell":65,"cat":"Other"},{"name":"Bottle Gourd","unit":"PC","buy":33,"sell":50,"cat":"Indian Veg"},{"name":"Potato","unit":"KG","buy":20,"sell":28,"cat":"Indian Veg"},{"name":"Peeled Garlic","unit":"KG","buy":160,"sell":220,"cat":"Indian Veg"},{"name":"Banana Leaf","unit":"PC","buy":4,"sell":8,"cat":"Leafy Veg"},{"name":"Green Peas Frozen","unit":"KG","buy":130,"sell":170,"cat":"Frozen & Premium"},{"name":"Edible Flowers","unit":"PC","buy":174,"sell":240,"cat":"Exotic Veg"},{"name":"Oregano","unit":"KG","buy":540,"sell":700,"cat":"Other"},{"name":"Carrot","unit":"KG","buy":40,"sell":60,"cat":"Indian Veg"},{"name":"Red Capsicum","unit":"KG","buy":160,"sell":220,"cat":"Other"},{"name":"Yellow Capsicum","unit":"KG","buy":160,"sell":220,"cat":"Other"},{"name":"Green Capsicum","unit":"KG","buy":40,"sell":62,"cat":"Other"},{"name":"Tomato","unit":"KG","buy":40,"sell":49,"cat":"Other"},{"name":"Onion","unit":"KG","buy":14.5,"sell":24,"cat":"Other"},{"name":"Red Cabbage","unit":"KG","buy":80,"sell":128,"cat":"Other"},{"name":"Brinjal","unit":"KG","buy":30,"sell":55,"cat":"Other"},{"name":"Parval","unit":"KG","buy":40,"sell":80,"cat":"Indian Veg"},{"name":"Beans","unit":"KG","buy":90,"sell":120,"cat":"Other"},{"name":"Milk Heritage","unit":"L","buy":62,"sell":64,"cat":"Other"},{"name":"Lemon","unit":"KG","buy":90,"sell":130,"cat":"Indian Veg"},{"name":"Turi","unit":"KG","buy":45,"sell":80,"cat":"Other"},{"name":"Spinach","unit":"KG","buy":65,"sell":90,"cat":"Leafy Veg"},{"name":"Banana","unit":"KG","buy":60,"sell":78,"cat":"Fresh Fruits"},{"name":"Italian Basil G-A","unit":"KG","buy":620,"sell":800,"cat":"Other"},{"name":"Curd Godrej","unit":"KG","buy":99,"sell":115,"cat":"Other"},{"name":"Bitter Gourd","unit":"KG","buy":45,"sell":80,"cat":"Indian Veg"},{"name":"Sweet Corn","unit":"KG","buy":70,"sell":150,"cat":"Indian Veg"},{"name":"Basil","unit":"KG","buy":170,"sell":350,"cat":"Other"},{"name":"Kaffir Lime Leaves","unit":"KG","buy":1200,"sell":1560,"cat":"Exotic Veg"},{"name":"Celery","unit":"KG","buy":252,"sell":264,"cat":"Exotic Veg"},{"name":"Ivy Gourd","unit":"KG","buy":40,"sell":50,"cat":"Other"},{"name":"Bottle Gourd Big","unit":"PC","buy":30,"sell":45,"cat":"Other"},{"name":"Lemon Big","unit":"KG","buy":90,"sell":130,"cat":"Other"},{"name":"Arbi / Arvi","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Beans Long","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Big Brinjal","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Brinjal (Regular)","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Brinjal Bharat","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Brinjal Long","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Brinjal Small","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Brinjal White Small","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Cabbage","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Chikkudukaya (Hyacinth Beans)","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Chow Chow","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Cluster Beans","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Coconut","unit":"PC","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Coconut Water","unit":"L","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Cucumber European","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Dosakaya","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Drumsticks","unit":"PC","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Gokar Kaya","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Green Peas Fresh","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Jackfruit","unit":"PC","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Kaddu / Ash Gourd","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Madras Onion","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Onion (Large)","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Onion White","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Pumpkin Red","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Pumpkin White","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Pumpkin Yellow","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Radish (Mooli)","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Red Chilli Fresh","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Salan Chillies","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Snake Gourd","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Sweet Potato","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Tindli / Dondakaya","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Tomato Bangalore","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Tomato Local","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Turai / Ridged Gourd","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Yam","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Amaranth","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Bachalakura","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Chukkakura","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Gongura","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Methi / Fenugreek","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Mint","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Mustard Leaf","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Ponnagantikura","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Thotakura","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Asparagus (Local)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Asparagus (Imported)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Avocado (Indian)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Avocado (Imported)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Baby Carrot","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Baby Corn","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Baby Rocket (Hydroponic)","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Basil Leaves","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Bok Choy (Hydroponic)","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Brussel Sprouts","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Galangal Ginger","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Herb Parsley","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Herb Rosemary","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Herb Thyme","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Italian Lemon","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Jalapeno","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Kale Leaf","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Leeks","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Frisee/Endive)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Green Leaf)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Green) Hydroponic","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Iceberg)","unit":"PC","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Lollo Rosso)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Lollo Rosso) Hydroponic","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Pak Choi)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Radicchio)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Rocket)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Romaine)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Romaine) Hydroponic","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lotus Stem","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Mushroom (Button)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Sage","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Shalgam / Turnip","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Snow Peas","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Thai Red Chilli","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Apple (Red Imported)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Apple (Local)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Apple (Green)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Blueberry (Fresh)","unit":"PACK","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Chikoo / Sapota","unit":"PC","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Custard Apple","unit":"PC","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Dragon Fruit","unit":"PC","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Fig / Anjeer","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Grapes (Black)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Grapes (White)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Guava (Imported)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Kiwi","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Mango","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Mosambi / Sweet Lime","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Mulberries","unit":"PACK","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Musk Melon","unit":"PC","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Orange (Imported)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Orange (Local)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Papaya","unit":"PC","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Pears (Imported)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Plums (Imported)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Pomegranate / Anar","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Strawberry","unit":"PACK","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Tender Coconut","unit":"PC","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Watermelon","unit":"PC","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Avocado Pulp (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Apricot (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Blackberry (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Blueberry (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Cranberry (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Jamun (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Kiwi (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Lychee (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Mango Slices (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Mulberry (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Peach (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Pineapple Tidbits (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Raspberries (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Sitaphal / Custard Apple (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Strawberry (Imported, Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Sweet Corn (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]}]
const CATALOG    = [{"name":"Arbi / Arvi","cat":"Indian Veg","unit":"KG"},{"name":"Beans (French)","cat":"Indian Veg","unit":"KG"},{"name":"Beans Long","cat":"Indian Veg","unit":"KG"},{"name":"Beetroot","cat":"Indian Veg","unit":"KG"},{"name":"Bhendi / Lady Finger","cat":"Indian Veg","unit":"KG"},{"name":"Big Brinjal","cat":"Indian Veg","unit":"KG"},{"name":"Brinjal (Regular)","cat":"Indian Veg","unit":"KG"},{"name":"Brinjal Bharat","cat":"Indian Veg","unit":"KG"},{"name":"Brinjal Long","cat":"Indian Veg","unit":"KG"},{"name":"Brinjal Small","cat":"Indian Veg","unit":"KG"},{"name":"Brinjal White Small","cat":"Indian Veg","unit":"KG"},{"name":"Bitter Gourd / Karela","cat":"Indian Veg","unit":"KG"},{"name":"Bottle Gourd","cat":"Indian Veg","unit":"KG"},{"name":"Cabbage","cat":"Indian Veg","unit":"KG"},{"name":"Capsicum Green","cat":"Indian Veg","unit":"KG"},{"name":"Carrot","cat":"Indian Veg","unit":"KG"},{"name":"Cauliflower","cat":"Indian Veg","unit":"KG"},{"name":"Chikkudukaya (Hyacinth Beans)","cat":"Indian Veg","unit":"KG"},{"name":"Chow Chow","cat":"Indian Veg","unit":"KG"},{"name":"Cluster Beans","cat":"Indian Veg","unit":"KG"},{"name":"Coconut","cat":"Indian Veg","unit":"PC"},{"name":"Coconut Water","cat":"Indian Veg","unit":"L"},{"name":"Cucumber","cat":"Indian Veg","unit":"KG"},{"name":"Cucumber European","cat":"Indian Veg","unit":"KG"},{"name":"Dosakaya","cat":"Indian Veg","unit":"KG"},{"name":"Drumsticks","cat":"Indian Veg","unit":"PC"},{"name":"Garlic Whole","cat":"Indian Veg","unit":"KG"},{"name":"Ginger","cat":"Indian Veg","unit":"KG"},{"name":"Gokar Kaya","cat":"Indian Veg","unit":"KG"},{"name":"Green Chillies","cat":"Indian Veg","unit":"KG"},{"name":"Green Peas Fresh","cat":"Indian Veg","unit":"KG"},{"name":"Jackfruit","cat":"Indian Veg","unit":"PC"},{"name":"Kaddu / Ash Gourd","cat":"Indian Veg","unit":"KG"},{"name":"Lemon","cat":"Indian Veg","unit":"KG"},{"name":"Madras Onion","cat":"Indian Veg","unit":"KG"},{"name":"Mango Raw","cat":"Indian Veg","unit":"KG"},{"name":"Onion (Large)","cat":"Indian Veg","unit":"KG"},{"name":"Onion White","cat":"Indian Veg","unit":"KG"},{"name":"Parwal","cat":"Indian Veg","unit":"KG"},{"name":"Peeled Garlic","cat":"Indian Veg","unit":"KG"},{"name":"Potato","cat":"Indian Veg","unit":"KG"},{"name":"Potato Baby","cat":"Indian Veg","unit":"KG"},{"name":"Pumpkin Red","cat":"Indian Veg","unit":"KG"},{"name":"Pumpkin White","cat":"Indian Veg","unit":"KG"},{"name":"Pumpkin Yellow","cat":"Indian Veg","unit":"KG"},{"name":"Radish (Mooli)","cat":"Indian Veg","unit":"KG"},{"name":"Raw Banana","cat":"Indian Veg","unit":"KG"},{"name":"Raw Papaya","cat":"Indian Veg","unit":"PC"},{"name":"Red Chilli Fresh","cat":"Indian Veg","unit":"KG"},{"name":"Salan Chillies","cat":"Indian Veg","unit":"KG"},{"name":"Snake Gourd","cat":"Indian Veg","unit":"KG"},{"name":"Sweet Corn","cat":"Indian Veg","unit":"KG"},{"name":"Sweet Potato","cat":"Indian Veg","unit":"KG"},{"name":"Tindli / Dondakaya","cat":"Indian Veg","unit":"KG"},{"name":"Tomato Bangalore","cat":"Indian Veg","unit":"KG"},{"name":"Tomato Local","cat":"Indian Veg","unit":"KG"},{"name":"Turai / Ridged Gourd","cat":"Indian Veg","unit":"KG"},{"name":"Yam","cat":"Indian Veg","unit":"KG"},{"name":"Amaranth","cat":"Leafy Veg","unit":"KG"},{"name":"Bachalakura","cat":"Leafy Veg","unit":"KG"},{"name":"Banana Leaf","cat":"Leafy Veg","unit":"PC"},{"name":"Chukkakura","cat":"Leafy Veg","unit":"KG"},{"name":"Coriander Leaves","cat":"Leafy Veg","unit":"KG"},{"name":"Curry Leaves","cat":"Leafy Veg","unit":"KG"},{"name":"Dill Leaves","cat":"Leafy Veg","unit":"KG"},{"name":"Gongura","cat":"Leafy Veg","unit":"KG"},{"name":"Methi / Fenugreek","cat":"Leafy Veg","unit":"KG"},{"name":"Mint","cat":"Leafy Veg","unit":"KG"},{"name":"Mustard Leaf","cat":"Leafy Veg","unit":"KG"},{"name":"Palak / Spinach","cat":"Leafy Veg","unit":"KG"},{"name":"Ponnagantikura","cat":"Leafy Veg","unit":"KG"},{"name":"Spring Onion","cat":"Leafy Veg","unit":"KG"},{"name":"Thotakura","cat":"Leafy Veg","unit":"KG"},{"name":"Asparagus (Local)","cat":"Exotic Veg","unit":"KG"},{"name":"Asparagus (Imported)","cat":"Exotic Veg","unit":"KG"},{"name":"Avocado (Indian)","cat":"Exotic Veg","unit":"KG"},{"name":"Avocado (Imported)","cat":"Exotic Veg","unit":"KG"},{"name":"Baby Carrot","cat":"Exotic Veg","unit":"KG"},{"name":"Baby Corn","cat":"Exotic Veg","unit":"KG"},{"name":"Baby Rocket (Hydroponic)","cat":"Exotic Veg","unit":"PACK"},{"name":"Basil Leaves","cat":"Exotic Veg","unit":"PACK"},{"name":"Bok Choy","cat":"Exotic Veg","unit":"KG"},{"name":"Bok Choy (Hydroponic)","cat":"Exotic Veg","unit":"PACK"},{"name":"Broccoli","cat":"Exotic Veg","unit":"KG"},{"name":"Brussel Sprouts","cat":"Exotic Veg","unit":"PACK"},{"name":"Cabbage (Chinese)","cat":"Exotic Veg","unit":"KG"},{"name":"Cabbage (Red)","cat":"Exotic Veg","unit":"KG"},{"name":"Capsicum Red","cat":"Exotic Veg","unit":"KG"},{"name":"Capsicum Yellow","cat":"Exotic Veg","unit":"KG"},{"name":"Celery","cat":"Exotic Veg","unit":"KG"},{"name":"Cherry Tomato","cat":"Exotic Veg","unit":"KG"},{"name":"Edible Flower","cat":"Exotic Veg","unit":"PACK"},{"name":"Galangal Ginger","cat":"Exotic Veg","unit":"KG"},{"name":"Herb Parsley","cat":"Exotic Veg","unit":"PACK"},{"name":"Herb Rosemary","cat":"Exotic Veg","unit":"PACK"},{"name":"Herb Thyme","cat":"Exotic Veg","unit":"PACK"},{"name":"Italian Lemon","cat":"Exotic Veg","unit":"KG"},{"name":"Jalapeno","cat":"Exotic Veg","unit":"KG"},{"name":"Kaffir Lime Leaves","cat":"Exotic Veg","unit":"PACK"},{"name":"Kale Leaf","cat":"Exotic Veg","unit":"KG"},{"name":"Leeks","cat":"Exotic Veg","unit":"KG"},{"name":"Lemon Grass","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Frisee/Endive)","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Green Leaf)","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Green) Hydroponic","cat":"Exotic Veg","unit":"PACK"},{"name":"Lettuce (Iceberg)","cat":"Exotic Veg","unit":"PC"},{"name":"Lettuce (Lollo Rosso)","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Lollo Rosso) Hydroponic","cat":"Exotic Veg","unit":"PACK"},{"name":"Lettuce (Pak Choi)","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Radicchio)","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Rocket)","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Romaine)","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Romaine) Hydroponic","cat":"Exotic Veg","unit":"PACK"},{"name":"Lotus Stem","cat":"Exotic Veg","unit":"KG"},{"name":"Microgreens","cat":"Exotic Veg","unit":"PACK"},{"name":"Mushroom (Button)","cat":"Exotic Veg","unit":"KG"},{"name":"Sage","cat":"Exotic Veg","unit":"PACK"},{"name":"Shalgam / Turnip","cat":"Exotic Veg","unit":"KG"},{"name":"Snow Peas","cat":"Exotic Veg","unit":"KG"},{"name":"Thai Red Chilli","cat":"Exotic Veg","unit":"KG"},{"name":"Zucchini (Green)","cat":"Exotic Veg","unit":"KG"},{"name":"Zucchini (Yellow)","cat":"Exotic Veg","unit":"KG"},{"name":"Apple (Red Imported)","cat":"Fresh Fruits","unit":"KG"},{"name":"Apple (Local)","cat":"Fresh Fruits","unit":"KG"},{"name":"Apple (Green)","cat":"Fresh Fruits","unit":"KG"},{"name":"Banana","cat":"Fresh Fruits","unit":"KG"},{"name":"Blueberry (Fresh)","cat":"Fresh Fruits","unit":"PACK"},{"name":"Chikoo / Sapota","cat":"Fresh Fruits","unit":"PC"},{"name":"Custard Apple","cat":"Fresh Fruits","unit":"PC"},{"name":"Dragon Fruit","cat":"Fresh Fruits","unit":"PC"},{"name":"Fig / Anjeer","cat":"Fresh Fruits","unit":"KG"},{"name":"Grapes (Black)","cat":"Fresh Fruits","unit":"KG"},{"name":"Grapes (White)","cat":"Fresh Fruits","unit":"KG"},{"name":"Guava (Imported)","cat":"Fresh Fruits","unit":"KG"},{"name":"Kiwi","cat":"Fresh Fruits","unit":"KG"},{"name":"Mango","cat":"Fresh Fruits","unit":"KG"},{"name":"Mosambi / Sweet Lime","cat":"Fresh Fruits","unit":"KG"},{"name":"Mulberries","cat":"Fresh Fruits","unit":"PACK"},{"name":"Musk Melon","cat":"Fresh Fruits","unit":"PC"},{"name":"Orange (Imported)","cat":"Fresh Fruits","unit":"KG"},{"name":"Orange (Local)","cat":"Fresh Fruits","unit":"KG"},{"name":"Papaya","cat":"Fresh Fruits","unit":"PC"},{"name":"Pears (Imported)","cat":"Fresh Fruits","unit":"KG"},{"name":"Pineapple","cat":"Fresh Fruits","unit":"PC"},{"name":"Plums (Imported)","cat":"Fresh Fruits","unit":"KG"},{"name":"Pomegranate / Anar","cat":"Fresh Fruits","unit":"KG"},{"name":"Strawberry","cat":"Fresh Fruits","unit":"PACK"},{"name":"Tender Coconut","cat":"Fresh Fruits","unit":"PC"},{"name":"Watermelon","cat":"Fresh Fruits","unit":"PC"},{"name":"Avocado Pulp (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Apricot (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Blackberry (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Blueberry (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Cranberry (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Green Peas (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Jamun (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Kiwi (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Lychee (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Mango Slices (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Mulberry (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Peach (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Pineapple Tidbits (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Raspberries (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Sitaphal / Custard Apple (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Strawberry (Imported, Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Sweet Corn (Frozen)","cat":"Frozen & Premium","unit":"PACK"}]

/* ── helpers ── */
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const quarterStart = () => today()
const quarterEnd   = () => { const e=new Date(addMonths(today(),3)); e.setDate(e.getDate()-1); return e.toISOString().slice(0,10) }
const histSorted   = it => (it.hist||[]).slice().sort((a,b)=>a.d.localeCompare(b.d))
function buyOnDate(it,d){const h=histSorted(it).filter(x=>x.d<=(d||today()));return h.length?h[h.length-1]:null}

/* ── boot ── */
async function boot() {
  S.loading=true; render()
  const { data:{session} } = await getSession()
  S.user = session?.user||null; S.authReady=true
  if(S.user) await loadAll()
  S.loading=false; render()
}
async function loadAll(){
  S.loading=true; render()
  try{
    const [st,items,clients,bills,orders,customers,offers]=await Promise.all([
      loadSettings(),loadItems(),loadClients(),loadBills(),
      loadOrders().catch(()=>[]),loadCustomers().catch(()=>[]),loadOffers().catch(()=>[])
    ])
    if(st){S.settings={biz:st.biz,addr:st.addr,phone:st.phone,gstin:st.gstin,terms:st.terms,prefix:st.prefix};S.nextNo=st.next_no||1}
    S.items=items.length?items:SEED_ITEMS.map(i=>({...i,id:i.id||uuid4(),hist:i.hist||[]}))
    S.clients=clients; S.bills=bills; S.orders=orders; S.customers=customers; S.offers=offers
  }catch(e){console.error(e);toast('Load error: '+e.message)}
  S.draft=blankDraft(S.settings,S.nextNo); S.loading=false
}

/* ── autosave ── */
let saveTimer=null, dirty=new Map()
function queue(type,data){
  if(!S.user)return
  dirty.set(type+'|'+(data?.id||data?.name||type),{type,data})
  S.saving=true; paintStatus()
  clearTimeout(saveTimer); saveTimer=setTimeout(flush,1500)
}
async function flush(){
  if(!S.user)return
  const byName={}; S.items.forEach(i=>byName[i.name.toLowerCase()]=i)
  try{
    for(const{type,data} of dirty.values()){
      if(type==='item') await upsertItem(data)
      if(type==='buy')  await setBuyRate(data.id,data.date,data.rate)
      if(type==='client') await upsertClient(data)
      if(type==='card') await upsertCard(data.clientId,data.card,byName)
      if(type==='settings') await saveSettings(S.settings,S.nextNo)
    }
    dirty.clear(); S.saving=false; S.saveErr=''
  }catch(e){S.saveErr=e.message; S.saving=false}
  paintStatus()
}
function paintStatus(){
  const el=document.getElementById('saveStatus'); if(!el)return
  if(!S.user){el.textContent='';return}
  if(S.saving){el.textContent='● Saving…';el.className='ss saving';return}
  if(S.saveErr){el.textContent='⚠ Not saved';el.className='ss err';el.title=S.saveErr;return}
  el.textContent='✓ Saved'; el.className='ss ok'
}

/* ── auth ── */
async function doSignIn(){
  const e=document.getElementById('se').value.trim(), p=document.getElementById('sp').value
  if(!e||!p)return toast('Enter email and password')
  const{data,error}=await signIn(e,p)
  if(error)return toast(error.message)
  S.user=data.user; await loadAll(); render()
}
async function doSignOut(){ await signOut(); S.user=null; S.items=[]; S.clients=[]; S.bills=[]; render() }

/* ── draft ── */
function setClient(id){
  if(id==='__new'){
    const n=prompt('Client name'); if(!n?.trim())return render()
    const cl={id:uuid4(),name:n.trim(),phone:'',cards:[{id:uuid4(),from:quarterStart(),to:quarterEnd(),rates:{}}]}
    S.clients.push(cl); queue('client',cl); S.draft.clientId=cl.id; S.draft.customer=cl.name; render(); toast('Client added — set their rates on the Clients tab'); return
  }
  S.draft.clientId=id; const cl=S.clients.find(c=>c.id===id)
  S.draft.customer=cl?cl.name:''
  if(cl?.phone&&!S.draft.phone)S.draft.phone=cl.phone
  repriceLines(); render()
}
function repriceLines(){
  S.draft.lines.forEach(l=>{if(!l.name.trim())return;const r=rateFor(l.name,S.draft.clientId,S.draft.date);l.rate=r.rate||l.rate;l.buy=buyFor(l.name,S.draft.date)})
}
function addLine(){S.draft.lines.push(blankLine());render();setTimeout(()=>{const els=document.querySelectorAll('.nminp');if(els.length)els[els.length-1].focus()},10)}
function delLine(i){S.draft.lines.splice(i,1);if(!S.draft.lines.length)S.draft.lines.push(blankLine());render()}
async function doSaveBill(){
  const lines=S.draft.lines.filter(l=>l.name.trim()&&+l.qty>0)
  if(!lines.length)return toast('Add at least one item with a quantity')
  const t=calcTotals(S.draft), rec={...S.draft,total:t.total,cost:t.cost,profit:t.profit}
  S.saving=true; paintStatus()
  try{
    await saveBill(rec,lines,S.user.id)
    const ex=S.bills.findIndex(b=>b.no===rec.no)
    if(ex>=0)S.bills[ex]={...rec,lines}; else{S.bills.unshift({...rec,lines});S.nextNo++}
    await saveSettings(S.settings,S.nextNo)
    S.draft=blankDraft(S.settings,S.nextNo); S.saving=false; S.saveErr=''; toast('Bill saved'); render()
  }catch(e){S.saveErr=e.message;S.saving=false;paintStatus();toast('Save failed: '+e.message)}
}

/* ── autocomplete ── */
let acList=[], acIdx=-1
function acInput(i,el){
  S.draft.lines[i].name=el.value
  const q=el.value.trim().toLowerCase(), box=document.getElementById('ac'+i)
  if(!q){box.innerHTML='';return}
  acList=S.items.filter(it=>it.name.toLowerCase().includes(q)).sort((a,b)=>a.name.toLowerCase().indexOf(q)-b.name.toLowerCase().indexOf(q)).slice(0,9)
  acIdx=acList.length?0:-1
  const r=el.getBoundingClientRect()
  box.innerHTML='<div class="acdrop" style="left:'+r.left+'px;top:'+(r.bottom+3)+'px;width:'+Math.max(r.width,220)+'px">'
    +acList.map((it,k)=>{const rr=rateFor(it.name,S.draft.clientId,S.draft.date)
      return`<div class="${k===acIdx?'on':''}" onmousedown="pick(${i},${k})"><b>${esc(it.name)}</b><i>${rr.rate?money0(rr.rate)+'/'+it.unit:'no rate'} · ${esc(it.cat||'')}</i></div>`}).join('')
    +(acList.length?'':`<div class="new" onmousedown="pick(${i},-1)">Add "${esc(el.value)}" as new item</div>`)+'</div>'
}
function acKey(e,i){
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!acList.length)return;acIdx=(acIdx+(e.key==='ArrowDown'?1:-1)+acList.length)%acList.length;document.querySelectorAll('#ac'+i+' .acdrop>div').forEach((d,k)=>d.classList.toggle('on',k===acIdx))}
  else if(e.key==='Enter'){e.preventDefault();if(acList.length&&acIdx>=0)pick(i,acIdx);else{const b=document.getElementById('ac'+i);if(b)b.innerHTML=''}}
  else if(e.key==='Escape'){const b=document.getElementById('ac'+i);if(b)b.innerHTML=''}
}
function pick(i,k){
  const box=document.getElementById('ac'+i);if(box)box.innerHTML=''
  if(k>=0){const it=acList[k];const r=rateFor(it.name,S.draft.clientId,S.draft.date);S.draft.lines[i]={name:it.name,unit:it.unit,qty:S.draft.lines[i].qty,rate:r.rate,buy:it.buy}}
  else{const nm=S.draft.lines[i].name.trim();if(nm&&!S.items.some(x=>x.name.toLowerCase()===nm.toLowerCase())){const it={id:uuid4(),name:nm,unit:'KG',cat:'Other',sell:0,buy:0,hist:[]};S.items.unshift(it);queue('item',it);toast(nm+' added')}}
  render();setTimeout(()=>{const rows=document.querySelectorAll('table.entry tbody tr');if(rows[i]){const qs=rows[i].querySelectorAll('input');if(qs[1]){qs[1].focus();qs[1].select()}}},10)
}
function acBlur(i){setTimeout(()=>{const b=document.getElementById('ac'+i);if(b)b.innerHTML=''},160)}
function rowKey(e,i){if(e.key==='Enter'){e.preventDefault();if(i===S.draft.lines.length-1)addLine();else{const r=document.querySelectorAll('table.entry tbody tr')[i+1];if(r){const q=r.querySelector('.rn');if(q)q.focus()}}}}

/* ── paste WhatsApp ── */
let pasteText='', pasteRows=null
function openPaste(){pasteText='';pasteRows=null;renderModal()}
function closePaste(){pasteText='';pasteRows=null;document.getElementById('modal').innerHTML=''}
function readList(){const el=document.getElementById('pt');pasteText=el?el.value:'';if(!pasteText.trim())return toast('Paste the order first');const rows=parseList(pasteText,S.items);if(!rows.length)return toast('Nothing looked like an item');pasteRows=rows.map(r=>{const o={...r,choice:r.score>=0.40?r.idx:-1};if(o.choice>=0){const rr=rateFor(S.items[o.choice].name,S.draft.clientId,S.draft.date);o.rate=rr.rate;o.buy=buyFor(S.items[o.choice].name,S.draft.date)};return o});renderModal()}
function chooseItem(i,v){const r=pasteRows[i];r.choice=+v;if(r.choice>=0){const it=S.items[r.choice];const rr=rateFor(it.name,S.draft.clientId,S.draft.date);r.rate=rr.rate;r.buy=it.buy;if(!r.unitLocked)r.unit=it.unit};renderModal()}
function applyPaste(mode){
  const use=pasteRows.filter(r=>r.choice!==-2);if(!use.length)return toast('Nothing selected')
  if(mode==='replace')S.draft.lines=[]
  use.forEach(r=>{let name;if(r.choice>=0){name=S.items[r.choice].name}else{name=(r.name||'').trim().replace(/\b\w/g,c=>c.toUpperCase());if(!name)return;if(!S.items.some(x=>x.name.toLowerCase()===name.toLowerCase())){const it={id:uuid4(),name,unit:r.unit,cat:'Other',sell:0,buy:0,hist:[]};S.items.push(it);queue('item',it)}};S.draft.lines.push({name,unit:r.unit,qty:String(r.qty),rate:String(r.rate||''),buy:+r.buy||0})})
  S.draft.lines=S.draft.lines.filter(l=>l.name.trim()||(+l.qty>0));S.draft.lines.push(blankLine())
  closePaste();render();toast(use.length+' items added')
}
function renderModal(){
  const m=document.getElementById('modal')
  if(!pasteRows){m.innerHTML=`<div class="scrim" onmousedown="if(event.target===this)closePaste()"><div class="modal"><div class="mh"><h2>Paste the order list</h2><p>Copy the WhatsApp message and paste it below.</p></div><div class="mb"><textarea id="pt" placeholder="Onion 20kg&#10;Coriander 2kg&#10;Mint 1kg">${esc(pasteText)}</textarea></div><div class="mf"><button class="btn pri" onclick="readList()">Read list</button><button class="btn" onclick="pasteRows=null;renderModal()">Clear</button><button class="btn" onclick="closePaste()">Cancel</button></div></div></div>`;setTimeout(()=>{const t=document.getElementById('pt');if(t)t.focus()},20);return}
  const opts=S.items.map((it,i)=>({i,n:it.name})).sort((a,b)=>a.n.localeCompare(b.n)), n=pasteRows.filter(r=>r.choice!==-2).length
  m.innerHTML=`<div class="scrim" onmousedown="if(event.target===this)closePaste()"><div class="modal"><div class="mh"><h2>Confirm items</h2><p>${pasteRows.length} lines read.</p></div><div class="mb"><table class="rv"><thead><tr><th>From message</th><th>Item</th><th style="width:70px">Qty</th><th style="width:78px">Unit</th><th style="width:78px">Rate</th></tr></thead><tbody>
  ${pasteRows.map((r,i)=>{const dot=r.choice<0?'d-new':(r.score>=0.62?'d-ok':'d-chk');return`<tr class="${r.choice===-2?'skip':''}"><td class="raw" title="${esc(r.raw)}"><i class="dot ${dot}"></i>${esc(r.raw)}</td><td><select onchange="chooseItem(${i},this.value)">${opts.map(o=>`<option value="${o.i}" ${o.i===r.choice?'selected':''}>${esc(o.n)}</option>`).join('')}<option value="-1" ${r.choice===-1?'selected':''}>+ Add as new</option><option value="-2" ${r.choice===-2?'selected':''}>Skip</option></select></td><td><input class="rn" inputmode="decimal" value="${r.qty}" oninput="pasteRows[${i}].qty=this.value"></td><td><select onchange="pasteRows[${i}].unit=this.value;pasteRows[${i}].unitLocked=true">${['KG','GM','PC','PACK','BUNCH','BOX','L','DOZ'].map(u=>`<option ${u===r.unit?'selected':''}>${u}</option>`).join('')}</select></td><td><input class="rn" inputmode="decimal" value="${r.rate||''}" placeholder="0" oninput="pasteRows[${i}].rate=this.value"></td></tr>`}).join('')}
  </tbody></table></div><div class="mf"><button class="btn pri" onclick="applyPaste('replace')">${S.draft.lines.filter(l=>l.name.trim()).length?'Replace bill':'Add'} (${n} items)</button>${S.draft.lines.filter(l=>l.name.trim()).length?`<button class="btn" onclick="applyPaste('add')">Add to existing</button>`:''}<button class="btn" onclick="pasteRows=null;renderModal()">Edit text</button><button class="btn" onclick="closePaste()">Cancel</button></div></div></div>`
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePaste()})

/* ── render ── */
function toast(m,dur=2200){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),dur)}

function render(){
  document.getElementById('app').innerHTML=
    !S.authReady?'<div class="center-msg"><div class="spin"></div></div>'
    :!S.user?loginView()
    :S.loading?'<div class="center-msg"><div class="spin"></div><p>Loading…</p></div>'
    :appView()
  if(S.user)paintStatus()
}
function go(t){S.tab=t;render()}

function loginView(){return`<div class="login-wrap"><div class="login-box">
  <div class="mark">Cropline</div>
  <p style="color:var(--muted);text-align:center;margin:0 0 20px">Sign in to your account</p>
  <label class="f"><span>Email</span><input class="inp" id="se" type="email" autocomplete="username" onkeydown="if(event.key==='Enter')document.getElementById('sp').focus()"></label>
  <label class="f" style="margin-top:12px"><span>Password</span><input class="inp" id="sp" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')doSignIn()"></label>
  <button class="btn pri" style="width:100%;margin-top:16px" onclick="doSignIn()">Sign in</button>
</div></div>`}

function appView(){
  const tabs=['bill','items','clients','orders','customers','offers','history','setup']
  const label={bill:'Bill',items:'Items',clients:'Clients',orders:'Orders',customers:'Customers',offers:'Offers',history:'History',setup:'Setup'}
  return`<div class="wrap">
  <header class="bar">
    <div class="mark">${esc(S.settings.biz||'Cropline')}<small>B2B produce supply</small></div>
    <span id="saveStatus" class="ss"></span>
    <a class="btn" href="/" target="_blank" rel="noopener" style="margin-left:8px">View storefront ↗</a>
    <nav class="tabs">${tabs.map(tb=>`<button class="${S.tab===tb?'on':''}" onclick="go('${tb}')">${label[tb]}</button>`).join('')}</nav>
  </header>
  <div id="view">${{bill:billView,items:()=>itemsView(),clients:()=>clientsView(),orders:()=>ordersView(),customers:()=>customersView(),offers:()=>offersView(),history:()=>histView(),setup:()=>setupView()}[S.tab]()}</div>
  </div><div id="modal"></div><div id="print"></div>`
}

/* ── bill view ── */
function billView(){
  const t=calcTotals(S.draft), d=S.draft
  const cl=S.clients.find(c=>c.id===d.clientId), card=cl?activeCard(cl,d.date):null
  const days=card?.to?Math.round((new Date(card.to)-new Date(d.date||today()))/86400000):null
  return`<div class="cols">
  <div class="panel">
    <div class="meta">
      <label class="f"><span>Bill no.</span><input class="inp" value="${esc(d.no)}" oninput="S.draft.no=this.value"></label>
      <label class="f"><span>Date</span><input class="inp" type="date" value="${d.date}" oninput="S.draft.date=this.value;repriceLines();render()"></label>
      <label class="f"><span>Customer</span><select class="inp" onchange="setClient(this.value)">
        <option value="">Walk-in / cash</option>
        ${S.clients.map(c=>`<option value="${c.id}" ${c.id===d.clientId?'selected':''}>${esc(c.name)}</option>`).join('')}
        <option value="__new">+ New client…</option></select></label>
      <label class="f"><span>Phone</span><input class="inp" value="${esc(d.phone)}" oninput="S.draft.phone=this.value"></label>
    </div>
    ${cl?`<div class="badge ${!card?'red':days!=null&&days<0?'red':days!=null&&days<=14?'amber':'green'}" style="margin-bottom:12px">
      ${esc(cl.name)} · ${card?Object.keys(card.rates||{}).length+' agreed rates · valid to '+dmy(card.to):'no rate list — set one on the Clients tab'}</div>`:''}
    <div class="tscroll"><table class="entry"><thead><tr>
      <th style="width:28px"></th><th>Item</th><th style="width:96px">Unit</th>
      <th class="r" style="width:78px">Qty</th><th class="r" style="width:86px">Rate</th>
      <th class="r" style="width:108px">Amount</th><th style="width:32px"></th>
    </tr></thead><tbody>
    ${d.lines.map((l,i)=>{const loss=+l.rate>0&&+l.buy>0&&+l.buy>+l.rate
      return`<tr class="${loss?'loss':''}">
      <td class="sr">${i+1}</td>
      <td><div class="aw"><input class="cell nminp" value="${esc(l.name)}" placeholder="Type vegetable…" autocomplete="off"
        oninput="S.draft.lines[${i}].name=this.value;acInput(${i},this)"
        onkeydown="acKey(event,${i})" onblur="acBlur(${i})">
        <div id="ac${i}"></div></div></td>
      <td><select class="cell" onchange="S.draft.lines[${i}].unit=this.value">
        ${['KG','GM','PC','PACK','BUNCH','BOX','L','DOZ'].map(u=>`<option ${u===l.unit?'selected':''}>${u}</option>`).join('')}</select></td>
      <td><input class="cell r rn" type="number" step="any" value="${l.qty||''}" placeholder="0"
        oninput="S.draft.lines[${i}].qty=this.value" onkeydown="rowKey(event,${i})"></td>
      <td><input class="cell r rn" type="number" step="any" value="${l.rate||''}" placeholder="0"
        oninput="S.draft.lines[${i}].rate=this.value"></td>
      <td class="r amt">${+l.qty&&+l.rate?money(l.qty*l.rate):'<span class="dim">—</span>'}${loss?'<span class="warn" title="Selling below cost">!</span>':''}</td>
      <td><button class="del" onclick="delLine(${i})">×</button></td>
    </tr>`}).join('')}
    </tbody></table></div>
    <button class="addrow" onclick="addLine()">+ Add item</button>
    <button class="addrow" style="border-color:var(--leaf);color:var(--leaf);margin-top:6px" onclick="openPaste()">Paste WhatsApp list</button>
  </div>
  <div class="rail">
    <div class="tot">
      <div class="tr"><span>Subtotal</span><b>${money(t.sub)}</b></div>
      <div class="tr"><span>GST</span><span><input class="mini" type="number" step="any" value="${d.gst}" oninput="S.draft.gst=this.value"> % ${money(t.gst)}</span></div>
      <div class="tr"><span>Less</span><input class="mini" type="number" step="any" value="${d.discount}" oninput="S.draft.discount=this.value"></div>
      <div class="tr grand"><span>Total</span><b>${money0(t.total)}</b></div>
      <div class="words">${inWords(t.total)}</div>
    </div>
    <div class="profit">
      <div class="hd">Margin — not printed</div>
      <div class="prow"><span>Buying cost</span><span>${money0(t.cost)}</span></div>
      <div class="prow"><span>Billed</span><span>${money0(t.sub-(+d.discount||0))}</span></div>
      <div class="pbig"><span>Profit</span><b>${money0(t.profit)}</b></div>
    </div>
    <div class="acts">
      <button class="btn pri" onclick="doSaveBill()">Save bill</button>
      <button class="btn" onclick="doPrint()">Print</button>
    </div>
    <div class="acts">
      <button class="btn" style="flex:1" onclick="copyWA()">Copy for WhatsApp</button>
      <button class="btn" onclick="S.draft=blankDraft(S.settings,S.nextNo);render()">New</button>
    </div>
  </div></div>`
}
function doPrint(){buildBillPrint(S.draft,calcTotals(S.draft));setTimeout(()=>window.print(),80)}
function copyWA(){
  const d=S.draft,t=calcTotals(d),ls=d.lines.filter(l=>l.name.trim()&&+l.qty>0)
  const txt=[S.settings.biz,'Bill '+d.no+' · '+dmy(d.date),d.customer?'To: '+d.customer:'','',
    ...ls.map(l=>`${l.name} — ${l.qty} ${l.unit} × ${money0(l.rate)} = ${money0(l.qty*l.rate)}`),
    '','TOTAL: '+money0(t.total)].filter((x,i)=>i<4||x).join('\n')
  navigator.clipboard.writeText(txt).then(()=>toast('Copied'),()=>toast('Copy failed'))
}

/* ── window handlers for views.js callbacks ── */
window._setIAsOn = v => { setIAsOn(v); render() }
window._setICat  = v => { setICat(v);  render() }
window._setIQ    = v => { setIQ(v);    render() }
window._setAsOn  = v => { setAsOn(v);  render() }
window._setCQ    = v => { setCQ(v);    render() }
window._setCardSel = v => { setCardSel(v); render() }
window._rerender = () => render()

window._newItem = () => {
  const it={id:uuid4(),name:'',unit:'KG',cat:'Other',sell:0,buy:0,hist:[]}
  S.items.unshift(it); render()
}
window._delItem = i => {
  if(!confirm('Delete '+S.items[i].name+'?'))return
  S.items.splice(i,1); render()
}
window._setBuy = (i,val,d) => {
  const it=S.items[i]; if(!it)return
  const r=+val||0; it.hist=it.hist||[]
  if(r===0){it.hist=it.hist.filter(x=>x.d!==d)}
  else{const e=it.hist.find(x=>x.d===d);if(e)e.r=r;else it.hist.push({d,r})}
  const h=it.hist.slice().sort((a,b)=>a.d.localeCompare(b.d)),last=h[h.length-1]
  it.buy=last?last.r:0; it.buyOn=last?last.d:''
  queue('buy',{id:it.id,date:d,rate:r})
}
window._setCashRate = (i,v) => { S.items[i].sell=+v||0; queue('item',S.items[i]) }
window._setItemName = (i,v) => { S.items[i].name=v; queue('item',S.items[i]) }
window._setItemUnit = (i,v) => { S.items[i].unit=v; queue('item',S.items[i]) }
window._setItemCat  = (i,v) => { S.items[i].cat=v; queue('item',S.items[i]); render() }
window._carryForward = () => {
  const d=iAsOn||today(); let n=0
  S.items.forEach((it,i)=>{
    const h=(it.hist||[]).filter(x=>x.d<=(d)).sort((a,b)=>a.d.localeCompare(b.d))
    const last=h[h.length-1]
    if(last&&last.d!==d){window._setBuy(i,last.r,d);n++}
  })
  render(); toast(n?n+' rates carried forward':'All items already have a rate for that day')
}
window._fillCashRates = () => {
  // Walk-in customers on the storefront see `items.cash_rate` (the "sell"
  // column here). If it's never been set for an item, they see a ₹0 price.
  // This is a real data gap, not a bug — your billing has always run off
  // per-client rate cards, so "sell" was never mandatory before. This tool
  // fills the gap in bulk: cash rate = buying rate × (1 + margin%).
  const missing = S.items.filter(it => !(+it.sell > 0))
  if (!missing.length) { toast('Every item already has a cash rate.'); return }
  const withBuy = missing.filter(it => +it.buy > 0)
  const pctStr = prompt(
    `${missing.length} items have no cash rate (₹0 on the storefront).\n` +
    `${withBuy.length} of them have a buying rate to work from.\n\n` +
    `Set their cash rate to (buying rate × (1 + margin%))? Enter a margin %, e.g. 25`, '25')
  if (pctStr === null) return
  const pct = +pctStr
  if (!isFinite(pct)) { toast('Enter a plain number, e.g. 25 for 25%'); return }
  let n = 0
  withBuy.forEach(it => {
    const idx = S.items.indexOf(it)
    const rate = Math.round(+it.buy * (1 + pct / 100) * 100) / 100
    window._setCashRate(idx, rate)
    n++
  })
  render()
  const stillZero = missing.length - n
  toast(`Set cash rate for ${n} item${n === 1 ? '' : 's'}.` + (stillZero ? ` ${stillZero} item${stillZero === 1 ? '' : 's'} still have no buying rate to base it on — set those manually.` : ''))
}
window._showHist = i => {
  const it=S.items[i], h=(it.hist||[]).slice().sort((a,b)=>b.d.localeCompare(a.d))
  document.getElementById('modal').innerHTML=`<div class="scrim" onmousedown="if(event.target===this)closePaste()">
  <div class="modal" style="max-width:480px">
    <div class="mh"><h2>${esc(it.name)}</h2><p>Complete buying price history.</p></div>
    <div class="mb">${h.length?`<table class="grid"><thead><tr><th>Date</th><th class="r">Rate</th><th class="r">Change</th><th style="width:34px"></th></tr></thead><tbody>
    ${h.map((e,k)=>{const p=h[k+1];const dp=(p&&+p.r)?Math.round((e.r-p.r)/p.r*100):null
      return`<tr><td style="padding-left:10px">${dmy(e.d)}</td><td class="r num" style="font-weight:600">${money0(e.r)}</td>
      <td class="r num" style="padding-right:12px;color:${!dp?'var(--muted)':dp>0?'var(--red)':'var(--leaf)'}">${dp==null?'—':(dp>0?'+':'')+dp+'%'}</td>
      <td><button class="del" onclick="window._delHist(${i},'${e.d}')">×</button></td></tr>`}).join('')}
    </tbody></table>`:'<div class="empty"><b>No history yet</b>Enter a buying rate on the Items tab.</div>'}</div>
    <div class="mf"><button class="btn" onclick="closePaste()">Close</button></div>
  </div></div>`
}
window._delHist = (i,d) => {
  const it=S.items[i]; it.hist=(it.hist||[]).filter(x=>x.d!==d)
  const h=it.hist.slice().sort((a,b)=>a.d.localeCompare(b.d)),last=h[h.length-1]
  it.buy=last?last.r:0; it.buyOn=last?last.d:''
  queue('buy',{id:it.id,date:d,rate:0}); window._showHist(i); render()
}
window._printBuyList = () => {
  const d=iAsOn||today()
  const s=S.settings, rows=S.items.map(it=>({it,e:it.hist?.filter(x=>x.d<=d).sort((a,b)=>a.d.localeCompare(b.d)).at(-1)})).filter(x=>x.e&&+x.e.r>0)
  document.getElementById('print').innerHTML=`<div class="doc"><div class="ptop"><div><div class="pbiz">${esc(s.biz)}</div></div><div style="text-align:right;font-size:11px">Buying rates<br>${dmy(d)}</div></div>
  <table class="ptable"><thead><tr><th>#</th><th>Item</th><th>Unit</th><th class="r">Rate</th></tr></thead><tbody>
  ${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.it.name)}</td><td>${esc(r.it.unit)}</td><td class="r">${money0(r.e.r)}</td></tr>`).join('')}
  </tbody></table></div>`
  setTimeout(()=>window.print(),80)
}
window._shareBuyList = () => {
  const txt=buyListTextWA(iAsOn||today())
  navigator.clipboard.writeText(txt).then(()=>toast('Buying list copied'),()=>toast('Copy failed'))
}
window._newClient = () => {
  const n=prompt('Client name'); if(!n?.trim())return
  const cl={id:uuid4(),name:n.trim(),phone:'',cards:[{id:uuid4(),from:quarterStart(),to:quarterEnd(),rates:{}}]}
  S.clients.push(cl); queue('client',cl); setOpenClient(cl.id); setCardSel(null); render()
}
window._delClient = i => {
  if(!confirm('Delete '+S.clients[i].name+'?'))return
  S.clients.splice(i,1); render()
}
window._openClient = id => { setOpenClient(id); setCardSel(null); setAsOn(''); render() }
window._closeClient = () => { setOpenClient(''); setCardSel(null); setCQ(''); render() }
window._setClientPhone = (id,v) => { const cl=S.clients.find(c=>c.id===id); if(cl){cl.phone=v;queue('client',cl)} }
window._setCardDate = (id,ci,f,v) => {
  const cl=S.clients.find(c=>c.id===id); if(!cl)return
  cl.cards[ci][f]=v; queue('card',{clientId:id,card:cl.cards[ci]})
}
window._setRate = (id,ci,key,v) => {
  const cl=S.clients.find(c=>c.id===id); if(!cl)return
  cl.cards[ci].rates[key]=v===''?'':+v
  queue('card',{clientId:id,card:cl.cards[ci]})
}
window._addToCard = (id,ci,name) => {
  if(!name)return
  const cl=S.clients.find(c=>c.id===id); if(!cl)return
  const it=S.items.find(x=>x.name===name); if(!it)return
  cl.cards[ci].rates[name.toLowerCase()]=it.sell||0
  queue('card',{clientId:id,card:cl.cards[ci]}); render()
}
window._addCategory = (id,ci,cat) => {
  const cl=S.clients.find(c=>c.id===id); if(!cl)return
  let n=0; S.items.filter(it=>(it.cat||'Other')===cat).forEach(it=>{
    const k=it.name.toLowerCase()
    if(cl.cards[ci].rates[k]==null||cl.cards[ci].rates[k]===''){cl.cards[ci].rates[k]=it.sell||'';n++}
  })
  queue('card',{clientId:id,card:cl.cards[ci]}); render(); toast(n+' items added — set their prices')
}
window._dropFromCard = (id,ci,key) => {
  const cl=S.clients.find(c=>c.id===id); if(!cl)return
  delete cl.cards[ci].rates[key]; queue('card',{clientId:id,card:cl.cards[ci]}); render()
}
window._renewCard = id => {
  const cl=S.clients.find(c=>c.id===id); if(!cl)return
  const card=cl.cards.at(-1)||{to:today()}
  const from=addDays(card.to||today(),1), to=addDays(addMonths(from,3),-1)
  const newCard={id:uuid4(),from,to,rates:{...(card.rates||{})}}
  cl.cards.push(newCard); queue('card',{clientId:id,card:newCard})
  setCardSel(cl.cards.length-1); render(); toast('New period: '+dmy(from)+' – '+dmy(to))
}
window._dropPeriod = (id,ci) => {
  const cl=S.clients.find(c=>c.id===id); if(!cl||cl.cards.length<2)return
  if(!confirm('Delete this period?'))return
  cl.cards.splice(ci,1); setCardSel(null); render()
}
window._jumpToDate = (id,d) => {
  setAsOn(d); const cl=S.clients.find(c=>c.id===id); if(!cl)return
  const i=cl.cards.findIndex(c=>(!c.from||c.from<=d)&&(!c.to||c.to>=d))
  setCardSel(i>=0?i:null); render()
}
window._printCard = (id,ci) => { buildCardPrint(id,ci); setTimeout(()=>window.print(),80) }
window._shareCard = (id,ci) => {
  navigator.clipboard.writeText(cardTextWA(id,ci)).then(()=>toast('Price list copied'),()=>toast('Copy failed'))
}
window._loadBill = i => {
  const b=S.bills[i]; S.draft={...b,lines:[...b.lines.map(l=>({...l})),blankLine()]}; go('bill')
}
window._printBill = i => {
  const b=S.bills[i]; const t={sub:b.lines.reduce((a,l)=>a+(l.qty*l.rate),0),gst:0,disc:b.discount||0,total:b.total}
  t.gst=t.sub*(b.gst||0)/100; buildBillPrint(b,t); setTimeout(()=>window.print(),80)
}
window._delBill = i => {
  if(!confirm('Delete bill '+S.bills[i].no+'?'))return; S.bills.splice(i,1); render()
}
/* ── orders tab ── */
window._setOStatus = v => { setOStatus(v); render() }
window._setOQ = v => { setOQ(v); render() }
window._setOrderStatus = async (id,status) => {
  const o=S.orders.find(x=>x.id===id); if(!o)return
  const prev=o.status; o.status=status; render()
  try{ await updateOrderStatus(id,status) }
  catch(e){ o.status=prev; render(); toast('Could not update: '+e.message) }
}

/* ── customers tab ── */
window._setCustQ = v => { setCustQ(v); render() }
window._setCsmForm = v => { setCsmForm(v); render() }
window._createCsmCustomer = async () => {
  const email=document.getElementById('csmEmail').value.trim()
  const password=document.getElementById('csmPw').value
  const fullName=document.getElementById('csmName').value.trim()
  const phone=document.getElementById('csmPhone').value.trim()
  const businessName=document.getElementById('csmBiz').value.trim()
  const clientId=document.getElementById('csmClient').value
  if(!email||!password||!fullName)return toast('Name, email and password are required')
  try{
    const res=await createCsmCustomer({email,password,fullName,phone,businessName,clientId})
    S.customers=await loadCustomers(); setCsmForm(false); render()
    toast('Login created — share with the client: '+email+' / '+res.password)
  }catch(e){ toast('Could not create login: '+e.message) }
}
window._openCustomer = async id => {
  setCustOpen(id); setCustAddrs([]); render()
  const addrs=await loadCustomerAddresses(id); setCustAddrs(addrs); render()
}
window._closeCustomer = () => { setCustOpen(null); render() }
window._setCustActive = async (id,active) => {
  await setCustomerActive(id,active); const c=S.customers.find(x=>x.id===id); if(c)c.active=active; render()
}
window._linkCustomer = async (id,clientId) => {
  await linkCustomerToClient(id,clientId); const c=S.customers.find(x=>x.id===id); if(c)c.client_id=clientId||null; render()
}
window._newCustAddrForm = () => {
  document.getElementById('custAddrForm').innerHTML=`<div class="panel" style="background:#fff;margin-top:10px">
    <label class="f"><span>Label</span><input class="inp" id="naLabel2" placeholder="Restaurant, Kitchen…"></label>
    <label class="f"><span>Area</span><select class="inp" id="naArea2"><option>Kukatpally</option><option>Madhapur</option><option>Gachibowli</option><option>Custom</option></select></label>
    <label class="f"><span>Address line 1</span><input class="inp" id="naLine12"></label>
    <label class="f"><span>Address line 2</span><input class="inp" id="naLine22"></label>
    <label class="f"><span>Pincode</span><input class="inp" id="naPin2"></label>
    <label class="f"><span>Phone</span><input class="inp" id="naPhone2"></label>
    <button class="btn pri" onclick="window._saveCustAddr()">Save address</button>
  </div>`
}
window._saveCustAddr = async () => {
  const a={label:document.getElementById('naLabel2').value||'Address',area:document.getElementById('naArea2').value,
    line1:document.getElementById('naLine12').value,line2:document.getElementById('naLine22').value,
    pincode:document.getElementById('naPin2').value,phone:document.getElementById('naPhone2').value,
    isDefault:custAddrs.length===0}
  if(!a.line1||!a.phone)return toast('Address line 1 and phone are required')
  const saved=await adminSaveAddress(custOpen,a)
  setCustAddrs([...custAddrs,saved]); document.getElementById('custAddrForm').innerHTML=''; render()
}
window._deleteCustAddr = async id => {
  if(!confirm('Delete this address?'))return
  await adminDeleteAddress(id); setCustAddrs(custAddrs.filter(a=>a.id!==id)); render()
}

/* ── offers tab ── */
window._setOfferForm = v => { setOfferForm(v); render() }
window._saveOffer = async id => {
  const code=document.getElementById('ofCode').value.trim()
  if(!code)return toast('Enter a code')
  const o={
    id: id||undefined, code,
    label: document.getElementById('ofLabel').value.trim(),
    type: document.getElementById('ofType').value,
    value: document.getElementById('ofValue').value,
    minOrder: document.getElementById('ofMin').value,
    validFrom: document.getElementById('ofFrom').value,
    validTo: document.getElementById('ofTo').value,
    active: document.getElementById('ofActive').value==='1'
  }
  try{
    const saved=await upsertOffer(o)
    const i=S.offers.findIndex(x=>x.id===saved.id)
    if(i>=0)S.offers[i]=saved; else S.offers.unshift(saved)
    setOfferForm(null); render(); toast('Offer saved')
  }catch(e){ toast('Could not save offer: '+e.message) }
}
window._deleteOffer = async id => {
  if(!confirm('Delete this offer?'))return
  await deleteOffer(id); S.offers=S.offers.filter(o=>o.id!==id); setOfferForm(null); render()
}

window._setSetting = (k,v) => { S.settings[k]=v; queue('settings') }
window._setNextNo  = v => { S.nextNo=v; queue('settings') }
window._exportCSV  = () => {
  const rows=[['Bill No','Date','Customer','Item','Unit','Qty','Rate','Amount']]
  S.bills.forEach(b=>b.lines.forEach(l=>rows.push([b.no,b.date,b.customer,l.name,l.unit,l.qty,l.rate,(l.qty*l.rate).toFixed(2)])))
  const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='bills.csv'; a.click()
}
window._doSignOut  = doSignOut

/* ── expose for inline handlers ── */
Object.assign(window,{go,setClient,addLine,delLine,doSaveBill,copyWA,doPrint,
  acInput,acKey,pick,acBlur,rowKey,openPaste,closePaste,readList,chooseItem,applyPaste,renderModal,
  doSignIn,S,pasteRows,toast,money,money0,inWords})

boot()
