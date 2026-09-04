
import { sb, signIn, signOut, getSession, loadSettings, saveSettings,
         loadItems, upsertItem, setBuyRate,
         loadClients, upsertClient, upsertCard,
         loadBills, saveBill } from './db.js'
import { parseList } from './parser.js'
import { S, CATS, today, uuid4, money, money0, dmy, addDays, addMonths,
         blankLine, blankDraft, rateFor, buyFor, calcTotals } from './state.js'

/* ============================================================
   SEED DATA — catalogue + merged item list
   ============================================================ */
const SEED_ITEMS = [{"name":"Red Tomato Big","unit":"KG","buy":28,"sell":35,"cat":"Other"},{"name":"Potato Big","unit":"KG","buy":20,"sell":26,"cat":"Other"},{"name":"Potato Baby","unit":"KG","buy":42,"sell":42,"cat":"Indian Veg"},{"name":"Onion Big","unit":"KG","buy":20,"sell":26,"cat":"Other"},{"name":"Sambar Onion","unit":"KG","buy":116,"sell":125,"cat":"Other"},{"name":"Garlic Hole","unit":"KG","buy":140,"sell":150,"cat":"Indian Veg"},{"name":"Garlic Peeled","unit":"KG","buy":178,"sell":210,"cat":"Other"},{"name":"Ginger","unit":"KG","buy":140,"sell":190,"cat":"Indian Veg"},{"name":"Coconut Fresh","unit":"PC","buy":40,"sell":45,"cat":"Other"},{"name":"Coriander Leaves","unit":"KG","buy":90,"sell":117,"cat":"Leafy Veg"},{"name":"Curry Leaf","unit":"KG","buy":30,"sell":100,"cat":"Leafy Veg"},{"name":"Mint Leaves","unit":"KG","buy":100,"sell":130,"cat":"Other"},{"name":"Microgreen","unit":"PACK","buy":120,"sell":160,"cat":"Exotic Veg"},{"name":"Chilli Green","unit":"KG","buy":50,"sell":90,"cat":"Indian Veg"},{"name":"Chilli Red","unit":"KG","buy":30,"sell":100,"cat":"Other"},{"name":"Capsicum Green","unit":"KG","buy":40,"sell":70,"cat":"Indian Veg"},{"name":"Capsicum Yellow","unit":"KG","buy":140,"sell":300,"cat":"Exotic Veg"},{"name":"Capsicum Red","unit":"KG","buy":140,"sell":300,"cat":"Exotic Veg"},{"name":"Cabbage Green","unit":"KG","buy":36,"sell":36,"cat":"Other"},{"name":"Cabbage Red","unit":"KG","buy":121,"sell":140,"cat":"Exotic Veg"},{"name":"Cabbage Chinese","unit":"KG","buy":131,"sell":135,"cat":"Exotic Veg"},{"name":"Cucumber","unit":"KG","buy":35,"sell":50,"cat":"Indian Veg"},{"name":"Cherry Tomato","unit":"KG","buy":190,"sell":205,"cat":"Exotic Veg"},{"name":"Zucchini Green","unit":"KG","buy":170,"sell":220,"cat":"Exotic Veg"},{"name":"Spinach  / Palak","unit":"KG","buy":90,"sell":100,"cat":"Other"},{"name":"Spring Onion","unit":"KG","buy":120,"sell":166.67,"cat":"Leafy Veg"},{"name":"Zucchini Yellow","unit":"KG","buy":170,"sell":220,"cat":"Exotic Veg"},{"name":"Baby Corn Pealed","unit":"KG","buy":152,"sell":180,"cat":"Other"},{"name":"French Beans","unit":"KG","buy":120,"sell":150,"cat":"Indian Veg"},{"name":"Red Carrot","unit":"KG","buy":48,"sell":62,"cat":"Other"},{"name":"Raw Jack Fruit","unit":"KG","buy":90,"sell":200,"cat":"Other"},{"name":"Cauliflower","unit":"KG","buy":32.5,"sell":60,"cat":"Indian Veg"},{"name":"Lotus Root","unit":"KG","buy":180,"sell":200,"cat":"Other"},{"name":"Lady Finger","unit":"KG","buy":40,"sell":52,"cat":"Indian Veg"},{"name":"Lemon Yellow","unit":"KG","buy":170,"sell":221,"cat":"Other"},{"name":"Fresh Mushroom","unit":"KG","buy":190,"sell":247,"cat":"Other"},{"name":"Yam Root","unit":"KG","buy":40,"sell":91,"cat":"Other"},{"name":"Beetroot","unit":"KG","buy":30,"sell":40,"cat":"Indian Veg"},{"name":"Broccoli","unit":"KG","buy":133,"sell":190,"cat":"Exotic Veg"},{"name":"Bok Choy","unit":"KG","buy":172,"sell":196,"cat":"Exotic Veg"},{"name":"Celery Pata","unit":"KG","buy":192,"sell":248,"cat":"Other"},{"name":"Bajji Chilly","unit":"KG","buy":56,"sell":66,"cat":"Other"},{"name":"Radish White","unit":"KG","buy":21,"sell":30,"cat":"Other"},{"name":"Radish Red","unit":"KG","buy":174,"sell":280,"cat":"Other"},{"name":"Raw Papaya","unit":"KG","buy":33,"sell":40,"cat":"Indian Veg"},{"name":"Raw Mango","unit":"KG","buy":60,"sell":90,"cat":"Indian Veg"},{"name":"Thyme Fresh","unit":"KG","buy":350,"sell":400,"cat":"Other"},{"name":"Parsley Fresh","unit":"KG","buy":200,"sell":300,"cat":"Other"},{"name":"Basil Fresh","unit":"KG","buy":170,"sell":250,"cat":"Other"},{"name":"Lemon Grass","unit":"KG","buy":188,"sell":235,"cat":"Exotic Veg"},{"name":"Thai Ginger","unit":"KG","buy":270,"sell":450,"cat":"Other"},{"name":"Dill Leaves","unit":"BUNCH","buy":300,"sell":360,"cat":"Leafy Veg"},{"name":"Avocado","unit":"KG","buy":256,"sell":584,"cat":"Other"},{"name":"Pomegranate","unit":"KG","buy":174,"sell":390,"cat":"Other"},{"name":"Pineapple","unit":"PC","buy":100,"sell":111,"cat":"Fresh Fruits"},{"name":"Misc","unit":"KG","buy":400,"sell":520,"cat":"Other"},{"name":"Raw Banana","unit":"KG","buy":91,"sell":118.5,"cat":"Indian Veg"},{"name":"Califlower","unit":"KG","buy":50,"sell":65,"cat":"Other"},{"name":"Bottle Gourd","unit":"PC","buy":33,"sell":50,"cat":"Indian Veg"},{"name":"Potato","unit":"KG","buy":20,"sell":28,"cat":"Indian Veg"},{"name":"Peeled Garlic","unit":"KG","buy":160,"sell":220,"cat":"Indian Veg"},{"name":"Banana Leaf","unit":"PC","buy":4,"sell":8,"cat":"Leafy Veg"},{"name":"Green Peas Frozen","unit":"KG","buy":130,"sell":170,"cat":"Frozen & Premium"},{"name":"Edible Flowers","unit":"PC","buy":174,"sell":240,"cat":"Exotic Veg"},{"name":"Oregano","unit":"KG","buy":540,"sell":700,"cat":"Other"},{"name":"Carrot","unit":"KG","buy":40,"sell":60,"cat":"Indian Veg"},{"name":"Red Capsicum","unit":"KG","buy":160,"sell":220,"cat":"Other"},{"name":"Yellow Capsicum","unit":"KG","buy":160,"sell":220,"cat":"Other"},{"name":"Green Capsicum","unit":"KG","buy":40,"sell":62,"cat":"Other"},{"name":"Tomato","unit":"KG","buy":40,"sell":49,"cat":"Other"},{"name":"Onion","unit":"KG","buy":14.5,"sell":24,"cat":"Other"},{"name":"Red Cabbage","unit":"KG","buy":80,"sell":128,"cat":"Other"},{"name":"Brinjal","unit":"KG","buy":30,"sell":55,"cat":"Other"},{"name":"Parval","unit":"KG","buy":40,"sell":80,"cat":"Indian Veg"},{"name":"Beans","unit":"KG","buy":90,"sell":120,"cat":"Other"},{"name":"Milk Heritage","unit":"L","buy":62,"sell":64,"cat":"Other"},{"name":"Lemon","unit":"KG","buy":90,"sell":130,"cat":"Indian Veg"},{"name":"Turi","unit":"KG","buy":45,"sell":80,"cat":"Other"},{"name":"Spinach","unit":"KG","buy":65,"sell":90,"cat":"Leafy Veg"},{"name":"Banana","unit":"KG","buy":60,"sell":78,"cat":"Fresh Fruits"},{"name":"Italian Basil G-A","unit":"KG","buy":620,"sell":800,"cat":"Other"},{"name":"Curd Godrej","unit":"KG","buy":99,"sell":115,"cat":"Other"},{"name":"Bitter Gourd","unit":"KG","buy":45,"sell":80,"cat":"Indian Veg"},{"name":"Sweet Corn","unit":"KG","buy":70,"sell":150,"cat":"Indian Veg"},{"name":"Basil","unit":"KG","buy":170,"sell":350,"cat":"Other"},{"name":"Kaffir Lime Leaves","unit":"KG","buy":1200,"sell":1560,"cat":"Exotic Veg"},{"name":"Celery","unit":"KG","buy":252,"sell":264,"cat":"Exotic Veg"},{"name":"Ivy Gourd","unit":"KG","buy":40,"sell":50,"cat":"Other"},{"name":"Bottle Gourd Big","unit":"PC","buy":30,"sell":45,"cat":"Other"},{"name":"Lemon Big","unit":"KG","buy":90,"sell":130,"cat":"Other"},{"name":"Arbi / Arvi","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Beans Long","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Big Brinjal","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Brinjal (Regular)","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Brinjal Bharat","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Brinjal Long","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Brinjal Small","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Brinjal White Small","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Cabbage","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Chikkudukaya (Hyacinth Beans)","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Chow Chow","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Cluster Beans","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Coconut","unit":"PC","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Coconut Water","unit":"L","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Cucumber European","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Dosakaya","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Drumsticks","unit":"PC","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Gokar Kaya","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Green Peas Fresh","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Jackfruit","unit":"PC","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Kaddu / Ash Gourd","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Madras Onion","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Onion (Large)","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Onion White","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Pumpkin Red","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Pumpkin White","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Pumpkin Yellow","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Radish (Mooli)","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Red Chilli Fresh","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Salan Chillies","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Snake Gourd","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Sweet Potato","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Tindli / Dondakaya","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Tomato Bangalore","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Tomato Local","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Turai / Ridged Gourd","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Yam","unit":"KG","buy":0,"sell":0,"cat":"Indian Veg","hist":[]},{"name":"Amaranth","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Bachalakura","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Chukkakura","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Gongura","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Methi / Fenugreek","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Mint","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Mustard Leaf","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Ponnagantikura","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Thotakura","unit":"KG","buy":0,"sell":0,"cat":"Leafy Veg","hist":[]},{"name":"Asparagus (Local)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Asparagus (Imported)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Avocado (Indian)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Avocado (Imported)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Baby Carrot","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Baby Corn","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Baby Rocket (Hydroponic)","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Basil Leaves","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Bok Choy (Hydroponic)","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Brussel Sprouts","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Galangal Ginger","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Herb Parsley","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Herb Rosemary","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Herb Thyme","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Italian Lemon","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Jalapeno","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Kale Leaf","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Leeks","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Frisee/Endive)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Green Leaf)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Green) Hydroponic","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Iceberg)","unit":"PC","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Lollo Rosso)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Lollo Rosso) Hydroponic","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Pak Choi)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Radicchio)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Rocket)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Romaine)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lettuce (Romaine) Hydroponic","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Lotus Stem","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Mushroom (Button)","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Sage","unit":"PACK","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Shalgam / Turnip","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Snow Peas","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Thai Red Chilli","unit":"KG","buy":0,"sell":0,"cat":"Exotic Veg","hist":[]},{"name":"Apple (Red Imported)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Apple (Local)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Apple (Green)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Blueberry (Fresh)","unit":"PACK","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Chikoo / Sapota","unit":"PC","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Custard Apple","unit":"PC","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Dragon Fruit","unit":"PC","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Fig / Anjeer","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Grapes (Black)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Grapes (White)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Guava (Imported)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Kiwi","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Mango","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Mosambi / Sweet Lime","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Mulberries","unit":"PACK","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Musk Melon","unit":"PC","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Orange (Imported)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Orange (Local)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Papaya","unit":"PC","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Pears (Imported)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Plums (Imported)","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Pomegranate / Anar","unit":"KG","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Strawberry","unit":"PACK","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Tender Coconut","unit":"PC","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Watermelon","unit":"PC","buy":0,"sell":0,"cat":"Fresh Fruits","hist":[]},{"name":"Avocado Pulp (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Apricot (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Blackberry (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Blueberry (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Cranberry (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Jamun (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Kiwi (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Lychee (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Mango Slices (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Mulberry (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Peach (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Pineapple Tidbits (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Raspberries (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Sitaphal / Custard Apple (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Strawberry (Imported, Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]},{"name":"Sweet Corn (Frozen)","unit":"PACK","buy":0,"sell":0,"cat":"Frozen & Premium","hist":[]}]
const CATALOG    = [{"name":"Arbi / Arvi","cat":"Indian Veg","unit":"KG"},{"name":"Beans (French)","cat":"Indian Veg","unit":"KG"},{"name":"Beans Long","cat":"Indian Veg","unit":"KG"},{"name":"Beetroot","cat":"Indian Veg","unit":"KG"},{"name":"Bhendi / Lady Finger","cat":"Indian Veg","unit":"KG"},{"name":"Big Brinjal","cat":"Indian Veg","unit":"KG"},{"name":"Brinjal (Regular)","cat":"Indian Veg","unit":"KG"},{"name":"Brinjal Bharat","cat":"Indian Veg","unit":"KG"},{"name":"Brinjal Long","cat":"Indian Veg","unit":"KG"},{"name":"Brinjal Small","cat":"Indian Veg","unit":"KG"},{"name":"Brinjal White Small","cat":"Indian Veg","unit":"KG"},{"name":"Bitter Gourd / Karela","cat":"Indian Veg","unit":"KG"},{"name":"Bottle Gourd","cat":"Indian Veg","unit":"KG"},{"name":"Cabbage","cat":"Indian Veg","unit":"KG"},{"name":"Capsicum Green","cat":"Indian Veg","unit":"KG"},{"name":"Carrot","cat":"Indian Veg","unit":"KG"},{"name":"Cauliflower","cat":"Indian Veg","unit":"KG"},{"name":"Chikkudukaya (Hyacinth Beans)","cat":"Indian Veg","unit":"KG"},{"name":"Chow Chow","cat":"Indian Veg","unit":"KG"},{"name":"Cluster Beans","cat":"Indian Veg","unit":"KG"},{"name":"Coconut","cat":"Indian Veg","unit":"PC"},{"name":"Coconut Water","cat":"Indian Veg","unit":"L"},{"name":"Cucumber","cat":"Indian Veg","unit":"KG"},{"name":"Cucumber European","cat":"Indian Veg","unit":"KG"},{"name":"Dosakaya","cat":"Indian Veg","unit":"KG"},{"name":"Drumsticks","cat":"Indian Veg","unit":"PC"},{"name":"Garlic Whole","cat":"Indian Veg","unit":"KG"},{"name":"Ginger","cat":"Indian Veg","unit":"KG"},{"name":"Gokar Kaya","cat":"Indian Veg","unit":"KG"},{"name":"Green Chillies","cat":"Indian Veg","unit":"KG"},{"name":"Green Peas Fresh","cat":"Indian Veg","unit":"KG"},{"name":"Jackfruit","cat":"Indian Veg","unit":"PC"},{"name":"Kaddu / Ash Gourd","cat":"Indian Veg","unit":"KG"},{"name":"Lemon","cat":"Indian Veg","unit":"KG"},{"name":"Madras Onion","cat":"Indian Veg","unit":"KG"},{"name":"Mango Raw","cat":"Indian Veg","unit":"KG"},{"name":"Onion (Large)","cat":"Indian Veg","unit":"KG"},{"name":"Onion White","cat":"Indian Veg","unit":"KG"},{"name":"Parwal","cat":"Indian Veg","unit":"KG"},{"name":"Peeled Garlic","cat":"Indian Veg","unit":"KG"},{"name":"Potato","cat":"Indian Veg","unit":"KG"},{"name":"Potato Baby","cat":"Indian Veg","unit":"KG"},{"name":"Pumpkin Red","cat":"Indian Veg","unit":"KG"},{"name":"Pumpkin White","cat":"Indian Veg","unit":"KG"},{"name":"Pumpkin Yellow","cat":"Indian Veg","unit":"KG"},{"name":"Radish (Mooli)","cat":"Indian Veg","unit":"KG"},{"name":"Raw Banana","cat":"Indian Veg","unit":"KG"},{"name":"Raw Papaya","cat":"Indian Veg","unit":"PC"},{"name":"Red Chilli Fresh","cat":"Indian Veg","unit":"KG"},{"name":"Salan Chillies","cat":"Indian Veg","unit":"KG"},{"name":"Snake Gourd","cat":"Indian Veg","unit":"KG"},{"name":"Sweet Corn","cat":"Indian Veg","unit":"KG"},{"name":"Sweet Potato","cat":"Indian Veg","unit":"KG"},{"name":"Tindli / Dondakaya","cat":"Indian Veg","unit":"KG"},{"name":"Tomato Bangalore","cat":"Indian Veg","unit":"KG"},{"name":"Tomato Local","cat":"Indian Veg","unit":"KG"},{"name":"Turai / Ridged Gourd","cat":"Indian Veg","unit":"KG"},{"name":"Yam","cat":"Indian Veg","unit":"KG"},{"name":"Amaranth","cat":"Leafy Veg","unit":"KG"},{"name":"Bachalakura","cat":"Leafy Veg","unit":"KG"},{"name":"Banana Leaf","cat":"Leafy Veg","unit":"PC"},{"name":"Chukkakura","cat":"Leafy Veg","unit":"KG"},{"name":"Coriander Leaves","cat":"Leafy Veg","unit":"KG"},{"name":"Curry Leaves","cat":"Leafy Veg","unit":"KG"},{"name":"Dill Leaves","cat":"Leafy Veg","unit":"KG"},{"name":"Gongura","cat":"Leafy Veg","unit":"KG"},{"name":"Methi / Fenugreek","cat":"Leafy Veg","unit":"KG"},{"name":"Mint","cat":"Leafy Veg","unit":"KG"},{"name":"Mustard Leaf","cat":"Leafy Veg","unit":"KG"},{"name":"Palak / Spinach","cat":"Leafy Veg","unit":"KG"},{"name":"Ponnagantikura","cat":"Leafy Veg","unit":"KG"},{"name":"Spring Onion","cat":"Leafy Veg","unit":"KG"},{"name":"Thotakura","cat":"Leafy Veg","unit":"KG"},{"name":"Asparagus (Local)","cat":"Exotic Veg","unit":"KG"},{"name":"Asparagus (Imported)","cat":"Exotic Veg","unit":"KG"},{"name":"Avocado (Indian)","cat":"Exotic Veg","unit":"KG"},{"name":"Avocado (Imported)","cat":"Exotic Veg","unit":"KG"},{"name":"Baby Carrot","cat":"Exotic Veg","unit":"KG"},{"name":"Baby Corn","cat":"Exotic Veg","unit":"KG"},{"name":"Baby Rocket (Hydroponic)","cat":"Exotic Veg","unit":"PACK"},{"name":"Basil Leaves","cat":"Exotic Veg","unit":"PACK"},{"name":"Bok Choy","cat":"Exotic Veg","unit":"KG"},{"name":"Bok Choy (Hydroponic)","cat":"Exotic Veg","unit":"PACK"},{"name":"Broccoli","cat":"Exotic Veg","unit":"KG"},{"name":"Brussel Sprouts","cat":"Exotic Veg","unit":"PACK"},{"name":"Cabbage (Chinese)","cat":"Exotic Veg","unit":"KG"},{"name":"Cabbage (Red)","cat":"Exotic Veg","unit":"KG"},{"name":"Capsicum Red","cat":"Exotic Veg","unit":"KG"},{"name":"Capsicum Yellow","cat":"Exotic Veg","unit":"KG"},{"name":"Celery","cat":"Exotic Veg","unit":"KG"},{"name":"Cherry Tomato","cat":"Exotic Veg","unit":"KG"},{"name":"Edible Flower","cat":"Exotic Veg","unit":"PACK"},{"name":"Galangal Ginger","cat":"Exotic Veg","unit":"KG"},{"name":"Herb Parsley","cat":"Exotic Veg","unit":"PACK"},{"name":"Herb Rosemary","cat":"Exotic Veg","unit":"PACK"},{"name":"Herb Thyme","cat":"Exotic Veg","unit":"PACK"},{"name":"Italian Lemon","cat":"Exotic Veg","unit":"KG"},{"name":"Jalapeno","cat":"Exotic Veg","unit":"KG"},{"name":"Kaffir Lime Leaves","cat":"Exotic Veg","unit":"PACK"},{"name":"Kale Leaf","cat":"Exotic Veg","unit":"KG"},{"name":"Leeks","cat":"Exotic Veg","unit":"KG"},{"name":"Lemon Grass","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Frisee/Endive)","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Green Leaf)","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Green) Hydroponic","cat":"Exotic Veg","unit":"PACK"},{"name":"Lettuce (Iceberg)","cat":"Exotic Veg","unit":"PC"},{"name":"Lettuce (Lollo Rosso)","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Lollo Rosso) Hydroponic","cat":"Exotic Veg","unit":"PACK"},{"name":"Lettuce (Pak Choi)","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Radicchio)","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Rocket)","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Romaine)","cat":"Exotic Veg","unit":"KG"},{"name":"Lettuce (Romaine) Hydroponic","cat":"Exotic Veg","unit":"PACK"},{"name":"Lotus Stem","cat":"Exotic Veg","unit":"KG"},{"name":"Microgreens","cat":"Exotic Veg","unit":"PACK"},{"name":"Mushroom (Button)","cat":"Exotic Veg","unit":"KG"},{"name":"Sage","cat":"Exotic Veg","unit":"PACK"},{"name":"Shalgam / Turnip","cat":"Exotic Veg","unit":"KG"},{"name":"Snow Peas","cat":"Exotic Veg","unit":"KG"},{"name":"Thai Red Chilli","cat":"Exotic Veg","unit":"KG"},{"name":"Zucchini (Green)","cat":"Exotic Veg","unit":"KG"},{"name":"Zucchini (Yellow)","cat":"Exotic Veg","unit":"KG"},{"name":"Apple (Red Imported)","cat":"Fresh Fruits","unit":"KG"},{"name":"Apple (Local)","cat":"Fresh Fruits","unit":"KG"},{"name":"Apple (Green)","cat":"Fresh Fruits","unit":"KG"},{"name":"Banana","cat":"Fresh Fruits","unit":"KG"},{"name":"Blueberry (Fresh)","cat":"Fresh Fruits","unit":"PACK"},{"name":"Chikoo / Sapota","cat":"Fresh Fruits","unit":"PC"},{"name":"Custard Apple","cat":"Fresh Fruits","unit":"PC"},{"name":"Dragon Fruit","cat":"Fresh Fruits","unit":"PC"},{"name":"Fig / Anjeer","cat":"Fresh Fruits","unit":"KG"},{"name":"Grapes (Black)","cat":"Fresh Fruits","unit":"KG"},{"name":"Grapes (White)","cat":"Fresh Fruits","unit":"KG"},{"name":"Guava (Imported)","cat":"Fresh Fruits","unit":"KG"},{"name":"Kiwi","cat":"Fresh Fruits","unit":"KG"},{"name":"Mango","cat":"Fresh Fruits","unit":"KG"},{"name":"Mosambi / Sweet Lime","cat":"Fresh Fruits","unit":"KG"},{"name":"Mulberries","cat":"Fresh Fruits","unit":"PACK"},{"name":"Musk Melon","cat":"Fresh Fruits","unit":"PC"},{"name":"Orange (Imported)","cat":"Fresh Fruits","unit":"KG"},{"name":"Orange (Local)","cat":"Fresh Fruits","unit":"KG"},{"name":"Papaya","cat":"Fresh Fruits","unit":"PC"},{"name":"Pears (Imported)","cat":"Fresh Fruits","unit":"KG"},{"name":"Pineapple","cat":"Fresh Fruits","unit":"PC"},{"name":"Plums (Imported)","cat":"Fresh Fruits","unit":"KG"},{"name":"Pomegranate / Anar","cat":"Fresh Fruits","unit":"KG"},{"name":"Strawberry","cat":"Fresh Fruits","unit":"PACK"},{"name":"Tender Coconut","cat":"Fresh Fruits","unit":"PC"},{"name":"Watermelon","cat":"Fresh Fruits","unit":"PC"},{"name":"Avocado Pulp (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Apricot (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Blackberry (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Blueberry (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Cranberry (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Green Peas (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Jamun (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Kiwi (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Lychee (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Mango Slices (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Mulberry (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Peach (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Pineapple Tidbits (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Raspberries (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Sitaphal / Custard Apple (Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Strawberry (Imported, Frozen)","cat":"Frozen & Premium","unit":"PACK"},{"name":"Sweet Corn (Frozen)","cat":"Frozen & Premium","unit":"PACK"}]

/* ---- helpers ---- */
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const ONES=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
const TENS=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
function two(n){return n<20?ONES[n]:TENS[Math.floor(n/10)]+(n%10?' '+ONES[n%10]:'')}
function three(n){return(n>99?ONES[Math.floor(n/100)]+' Hundred'+(n%100?' ':''):'')+(n%100?two(n%100):'')}
function inWords(num){num=Math.round(num||0);if(!num)return 'Zero Rupees Only';let s='',p=[[10000000,'Crore'],[100000,'Lakh'],[1000,'Thousand']];for(const[v,n]of p){if(num>=v){s+=three(Math.floor(num/v))+' '+n+' ';num%=v}}if(num)s+=three(num);return s.trim().replace(/\s+/g,' ')+' Rupees Only'}

/* ============================================================
   BOOT — session → load data
   ============================================================ */
async function boot() {
  S.loading = true; render()
  const { data: { session } } = await getSession()
  S.user = session?.user || null
  S.authReady = true
  if (S.user) await loadAll()
  S.loading = false; render()
}
async function loadAll() {
  S.loading = true; render()
  try {
    const [st, items, clients, bills] = await Promise.all([
      loadSettings(), loadItems(), loadClients(), loadBills()
    ])
    if (st) { S.settings = { biz:st.biz,addr:st.addr,phone:st.phone,gstin:st.gstin,terms:st.terms,prefix:st.prefix }; S.nextNo=st.next_no||1 }
    S.items = items.length ? items : seedItems()
    S.clients = clients
    S.bills = bills
  } catch(e) { console.error(e) }
  S.draft = blankDraft(S.settings, S.nextNo)
  S.loading = false
}
function seedItems() {
  return SEED_ITEMS.map(i=>({...i, id:i.id||uuid4(), hist:i.hist||[]}))
}

/* ============================================================
   AUTOSAVE — debounced write per change type
   ============================================================ */
const pending = { items: new Set(), prices: new Map(), clients: new Set(), cards: [] }
let saveTimer = null
function queueSave(type, data) {
  if (!S.user) return
  if (type==='item') pending.items.add(data)
  if (type==='price') pending.prices.set(data.id+'|'+data.date, data)
  if (type==='client') pending.clients.add(data)
  if (type==='card') pending.cards.push(data)
  clearTimeout(saveTimer)
  saveTimer = setTimeout(flushSaves, 1200)
  S.saving = true; paintStatus()
}
async function flushSaves() {
  if (!S.user) return
  const byName = {}; S.items.forEach(i => byName[i.name.toLowerCase()] = i)
  try {
    for (const it of pending.items) await upsertItem(it)
    for (const p of pending.prices.values()) await setBuyRate(p.id, p.date, p.rate)
    for (const cl of pending.clients) await upsertClient(cl)
    for (const { client, card } of pending.cards) await upsertCard(client.id, card, byName)
    pending.items.clear(); pending.prices.clear(); pending.clients.clear(); pending.cards = []
    S.saving = false; S.saveErr = ''
  } catch(e) { S.saveErr = e.message; S.saving = false }
  paintStatus()
}
function paintStatus() {
  const el = document.getElementById('saveStatus')
  if (!el || !S.user) return
  if (S.saving) { el.textContent = '● Saving…'; el.className='ss saving'; return }
  if (S.saveErr) { el.textContent = '⚠ Not saved'; el.className='ss err'; el.title=S.saveErr; return }
  el.textContent = '✓ Saved'; el.className='ss ok'
}

/* ============================================================
   AUTH
   ============================================================ */
async function doSignIn() {
  const e = document.getElementById('se').value.trim()
  const p = document.getElementById('sp').value
  if (!e||!p) return toast('Enter email and password')
  const { data, error } = await signIn(e, p)
  if (error) return toast(error.message)
  S.user = data.user; await loadAll(); render()
}
async function doSignOut() { await signOut(); S.user=null; S.items=[]; S.clients=[]; S.bills=[]; render() }

/* ============================================================
   DRAFT BILL
   ============================================================ */
function setClient(id) {
  S.draft.clientId = id
  const cl = S.clients.find(c=>c.id===id)
  S.draft.customer = cl ? cl.name : ''
  if (cl?.phone && !S.draft.phone) S.draft.phone = cl.phone
  repriceLines()
  render()
}
function repriceLines() {
  S.draft.lines.forEach(l => {
    if (!l.name.trim()) return
    const r = rateFor(l.name, S.draft.clientId, S.draft.date)
    l.rate = r.rate||l.rate; l.buy = buyFor(l.name, S.draft.date)
  })
}
function addLine() { S.draft.lines.push(blankLine()); render(); setTimeout(()=>{const els=document.querySelectorAll('.nminp');if(els.length)els[els.length-1].focus()},10) }
function delLine(i) { S.draft.lines.splice(i,1); if(!S.draft.lines.length)S.draft.lines.push(blankLine()); render() }

async function doSaveBill() {
  const lines = S.draft.lines.filter(l=>l.name.trim()&&+l.qty>0)
  if (!lines.length) return toast('Add at least one item with a quantity')
  const t = calcTotals(S.draft)
  const rec = { ...S.draft, total:t.total, cost:t.cost, profit:t.profit }
  S.saving = true; paintStatus()
  try {
    await saveBill(rec, lines, S.user.id)
    const ex = S.bills.findIndex(b=>b.no===rec.no)
    if (ex>=0) S.bills[ex]={...rec,lines}; else { S.bills.unshift({...rec,lines}); S.nextNo++ }
    await saveSettings(S.settings, S.nextNo)
    S.draft = blankDraft(S.settings, S.nextNo)
    S.saving = false; S.saveErr = ''; toast('Bill saved'); render()
  } catch(e) { S.saveErr=e.message; S.saving=false; paintStatus(); toast('Save failed: '+e.message) }
}

/* ---- autocomplete ---- */
let acList=[], acIdx=-1
function acInput(i, el) {
  S.draft.lines[i].name = el.value
  const q = el.value.trim().toLowerCase()
  const box = document.getElementById('ac'+i)
  if (!q) { box.innerHTML=''; return }
  acList = S.items.filter(it=>it.name.toLowerCase().includes(q))
    .sort((a,b)=>a.name.toLowerCase().indexOf(q)-b.name.toLowerCase().indexOf(q)).slice(0,9)
  acIdx = acList.length ? 0 : -1
  const r = el.getBoundingClientRect()
  box.innerHTML = '<div class="acdrop" style="left:'+r.left+'px;top:'+(r.bottom+3)+'px;width:'+Math.max(r.width,220)+'px">'
    + acList.map((it,k)=>{ const rr=rateFor(it.name,S.draft.clientId,S.draft.date)
        return `<div class="${k===acIdx?'on':''}" onmousedown="pick(${i},${k})"><b>${esc(it.name)}</b><i>${rr.rate?money0(rr.rate)+'/'+it.unit:'no rate'} · ${esc(it.cat||'')}</i></div>` }).join('')
    + (acList.length?'':`<div class="new" onmousedown="pick(${i},-1)">Add "${esc(el.value)}" as new item</div>`)
    + '</div>'
}
function acKey(e,i) {
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();acIdx=(acIdx+(e.key==='ArrowDown'?1:-1)+Math.max(1,acList.length))%Math.max(1,acList.length);document.querySelectorAll('#ac'+i+' .acdrop > div').forEach((d,k)=>d.classList.toggle('on',k===acIdx))}
  else if(e.key==='Enter'){e.preventDefault();if(acList.length&&acIdx>=0)pick(i,acIdx);else{const b=document.getElementById('ac'+i);if(b)b.innerHTML=''}}
  else if(e.key==='Escape'){const b=document.getElementById('ac'+i);if(b)b.innerHTML=''}
}
function pick(i,k) {
  const box=document.getElementById('ac'+i); if(box)box.innerHTML=''
  if(k>=0){const it=acList[k];const r=rateFor(it.name,S.draft.clientId,S.draft.date)
    S.draft.lines[i]={name:it.name,unit:it.unit,qty:S.draft.lines[i].qty,rate:r.rate,buy:it.buy}
  } else {
    const nm=S.draft.lines[i].name.trim()
    if(nm&&!S.items.some(x=>x.name.toLowerCase()===nm.toLowerCase())){
      const it={id:uuid4(),name:nm,unit:'KG',cat:'Other',sell:0,buy:0,hist:[]}
      S.items.unshift(it); queueSave('item',it); toast(nm+' added to your items')}
  }
  render(); setTimeout(()=>{const rows=document.querySelectorAll('table.entry tbody tr');if(rows[i]){const qs=rows[i].querySelectorAll('input');if(qs[1]){qs[1].focus();qs[1].select()}}},10)
}
function acBlur(i){setTimeout(()=>{const b=document.getElementById('ac'+i);if(b)b.innerHTML=''},160)}
function rowKey(e,i){if(e.key==='Enter'){e.preventDefault();if(i===S.draft.lines.length-1)addLine();else{const r=document.querySelectorAll('table.entry tbody tr')[i+1];if(r){const q=r.querySelector('input[type="number"],input.rn');if(q)q.focus()}}}}

/* ---- paste WhatsApp list ---- */
let pasteText='', pasteRows=null
const AUTO=0.62, MAYBE=0.40
function openPaste(){pasteText='';pasteRows=null;renderModal()}
function closePaste(){pasteText='';pasteRows=null;document.getElementById('modal').innerHTML=''}
function readList(){
  const el=document.getElementById('pt'); const txt=el?el.value:pasteText; pasteText=txt
  if(!txt.trim())return toast('Paste the order first')
  const rows=parseList(txt,S.items)
  if(!rows.length)return toast('Nothing looked like an item with a quantity')
  pasteRows=rows.map(r=>{const o={...r,choice:r.score>=MAYBE?r.idx:-1}
    if(o.choice>=0){const rr=rateFor(S.items[o.choice].name,S.draft.clientId,S.draft.date)
      o.rate=rr.rate;o.buy=buyFor(S.items[o.choice].name,S.draft.date)}
    return o})
  renderModal()
}
function chooseItem(i,v){
  const r=pasteRows[i];r.choice=+v
  if(r.choice>=0){const it=S.items[r.choice];const rr=rateFor(it.name,S.draft.clientId,S.draft.date)
    r.rate=rr.rate;r.buy=it.buy;if(!r.unitLocked)r.unit=it.unit}
  renderModal()
}
function applyPaste(mode){
  const use=pasteRows.filter(r=>r.choice!==-2)
  if(!use.length)return toast('Nothing selected')
  if(mode==='replace')S.draft.lines=[]
  use.forEach(r=>{
    let name;
    if(r.choice>=0){name=S.items[r.choice].name}
    else{name=(r.name||'').trim().replace(/\b\w/g,c=>c.toUpperCase());if(!name)return
      if(!S.items.some(x=>x.name.toLowerCase()===name.toLowerCase())){
        const it={id:uuid4(),name,unit:r.unit,cat:'Other',sell:0,buy:0,hist:[]}
        S.items.push(it);queueSave('item',it)}}
    S.draft.lines.push({name,unit:r.unit,qty:String(r.qty),rate:String(r.rate||''),buy:+r.buy||0})
  })
  S.draft.lines=S.draft.lines.filter(l=>l.name.trim()||(+l.qty>0))
  S.draft.lines.push(blankLine())
  closePaste();render();toast(use.length+' items added')
}
function renderModal(){
  const m=document.getElementById('modal')
  if(!pasteRows){
    m.innerHTML=`<div class="scrim" onmousedown="if(event.target===this)closePaste()"><div class="modal"><div class="mh"><h2>Paste the order list</h2><p>Copy the WhatsApp message and paste it below.</p></div><div class="mb"><textarea id="pt" placeholder="Onion 20kg&#10;Coriander 2kg&#10;Mint 1kg">${esc(pasteText)}</textarea></div><div class="mf"><button class="btn pri" onclick="readList()">Read list</button><button class="btn" onclick="closePaste()">Cancel</button></div></div></div>`
    setTimeout(()=>{const t=document.getElementById('pt');if(t)t.focus()},20);return
  }
  const opts=S.items.map((it,i)=>({i,n:it.name})).sort((a,b)=>a.n.localeCompare(b.n))
  const n=pasteRows.filter(r=>r.choice!==-2).length
  m.innerHTML=`<div class="scrim" onmousedown="if(event.target===this)closePaste()"><div class="modal"><div class="mh"><h2>Confirm items</h2><p>${pasteRows.length} lines read.</p></div><div class="mb"><table class="rv"><thead><tr><th>From message</th><th>Item</th><th style="width:70px">Qty</th><th style="width:78px">Unit</th><th style="width:78px">Rate</th></tr></thead><tbody>
  ${pasteRows.map((r,i)=>{const dot=r.choice<0?'d-new':(r.score>=AUTO?'d-ok':'d-chk');return `<tr class="${r.choice===-2?'skip':''}"><td class="raw" title="${esc(r.raw)}"><i class="dot ${dot}"></i>${esc(r.raw)}</td><td><select onchange="chooseItem(${i},this.value)">${opts.map(o=>`<option value="${o.i}" ${o.i===r.choice?'selected':''}>${esc(o.n)}</option>`).join('')}<option value="-1" ${r.choice===-1?'selected':''}>+ Add as new</option><option value="-2" ${r.choice===-2?'selected':''}>Skip</option></select></td><td><input class="rn" inputmode="decimal" value="${r.qty}" oninput="pasteRows[${i}].qty=this.value"></td><td><select onchange="pasteRows[${i}].unit=this.value;pasteRows[${i}].unitLocked=true">${['KG','GM','PC','PACK','BUNCH','BOX','L','DOZ'].map(u=>`<option ${u===r.unit?'selected':''}>${u}</option>`).join('')}</select></td><td><input class="rn" inputmode="decimal" value="${r.rate||''}" placeholder="0" oninput="pasteRows[${i}].rate=this.value"></td></tr>`}).join('')}
  </tbody></table></div><div class="mf"><button class="btn pri" onclick="applyPaste('${S.draft.lines.filter(l=>l.name.trim()).length?'replace':'add'}')">${S.draft.lines.filter(l=>l.name.trim()).length?'Replace bill':'Add'} (${n} items)</button>${S.draft.lines.filter(l=>l.name.trim()).length?`<button class="btn" onclick="applyPaste('add')">Add to existing</button>`:''}<button class="btn" onclick="pasteRows=null;renderModal()">Edit text</button><button class="btn" onclick="closePaste()">Cancel</button></div></div></div>`
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePaste()})

/* ============================================================
   RENDER ENGINE — builds the whole page
   ============================================================ */
function toast(m,dur=2200){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),dur)}
let iAsOn='', iCat='', openClient='', cq='', cardSel=null, asOn=''

function render() {
  document.getElementById('app').innerHTML = !S.authReady ? '<div class="center-msg"><div class="spin"></div></div>'
    : !S.user ? loginView()
    : S.loading ? '<div class="center-msg"><div class="spin"></div><p>Loading…</p></div>'
    : appView()
  if (S.user) paintStatus()
}

function loginView() {
  return `<div class="login-wrap"><div class="login-box">
    <div class="mark">Cropline</div>
    <p style="color:var(--muted);text-align:center;margin:0 0 20px">Sign in to your account</p>
    <label class="f"><span>Email</span><input class="inp" id="se" type="email" autocomplete="username" placeholder="your@email.com" onkeydown="if(event.key==='Enter')document.getElementById('sp').focus()"></label>
    <label class="f" style="margin-top:12px"><span>Password</span><input class="inp" id="sp" type="password" autocomplete="current-password" placeholder="••••••••" onkeydown="if(event.key==='Enter')doSignIn()"></label>
    <button class="btn pri" style="width:100%;margin-top:16px" onclick="doSignIn()">Sign in</button>
  </div></div>`
}

function appView() {
  const tabs = ['bill','items','clients','history','setup']
  return `<div class="wrap">
    <header class="bar">
      <div class="mark">${esc(S.settings.biz||'Cropline')}<small>B2B produce supply</small></div>
      <span id="saveStatus" class="ss"></span>
      <nav class="tabs">${tabs.map(tb=>`<button class="${S.tab===tb?'on':''}" onclick="go('${tb}')">${tb.charAt(0).toUpperCase()+tb.slice(1)}</button>`).join('')}</nav>
    </header>
    <div id="view">${{bill:billView,items:itemsView,clients:clientsView,history:histView,setup:setupView}[S.tab]()}</div>
  </div><div id="modal"></div>${printLayer()}`
}
function go(t){S.tab=t;openClient='';cardSel=null;asOn='';render()}

/* ---- bill tab ---- */
function billView() {
  const t = calcTotals(S.draft), d = S.draft
  return `<div class="cols">
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
    <div class="tscroll"><table class="entry"><thead><tr>
      <th style="width:28px"></th><th>Item</th><th style="width:96px">Unit</th>
      <th class="r" style="width:78px">Qty</th><th class="r" style="width:86px">Rate</th>
      <th class="r" style="width:108px">Amount</th><th style="width:32px"></th>
    </tr></thead><tbody>
    ${d.lines.map((l,i)=>{const loss=+l.rate>0&&+l.buy>0&&+l.buy>+l.rate
      return `<tr class="${loss?'loss':''}">
      <td class="sr">${i+1}</td>
      <td><div class="aw"><input class="cell nminp" value="${esc(l.name)}" placeholder="Type vegetable…" autocomplete="off"
        oninput="S.draft.lines[${i}].name=this.value;acInput(${i},this)"
        onkeydown="acKey(event,${i})" onblur="acBlur(${i})">
        <div id="ac${i}"></div></div></td>
      <td><select class="cell" onchange="S.draft.lines[${i}].unit=this.value">
        ${['KG','GM','PC','PACK','BUNCH','BOX','L','DOZ'].map(u=>`<option ${u===l.unit?'selected':''}>${u}</option>`).join('')}</select></td>
      <td><input class="cell r rn" type="number" step="any" value="${l.qty}" placeholder="0"
        oninput="S.draft.lines[${i}].qty=this.value" onkeydown="rowKey(event,${i})"></td>
      <td><input class="cell r rn" type="number" step="any" value="${l.rate}" placeholder="0"
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
      <div class="hd">Margin — not on bill</div>
      <div class="prow"><span>Buying cost</span><span>${money0(t.cost)}</span></div>
      <div class="prow"><span>Billed</span><span>${money0(t.sub-t.disc)}</span></div>
      <div class="pbig"><span>Profit</span><b>${money0(t.profit)}</b></div>
    </div>
    <div class="acts">
      <button class="btn pri" onclick="doSaveBill()">Save bill</button>
      <button class="btn" onclick="window.print()">Print</button>
      <button class="btn" onclick="copyWA()">Copy for WhatsApp</button>
      <button class="btn" onclick="S.draft=blankDraft(S.settings,S.nextNo);render()">New</button>
    </div>
  </div></div>`
}

/* ---- stubs for items/clients/history/setup tabs (same logic as original) ---- */
function itemsView(){return `<div class="panel"><div class="center-msg" style="padding:40px"><p>Items tab — same as original app.</p><p style="color:var(--muted)">Full implementation is in the HTML version; this module version is being completed.</p></div></div>`}
function clientsView(){return `<div class="panel"><div class="center-msg" style="padding:40px"><p>Clients tab — carries over from original app.</p></div></div>`}
function histView(){return `<div class="panel"><p style="padding:16px">History: ${S.bills.length} bills loaded from Supabase.</p><ul>${S.bills.slice(0,20).map(b=>`<li>${b.no} · ${dmy(b.date)} · ${b.customer} · ${money0(b.total)}</li>`).join('')}</ul></div>`}
function setupView(){return `<div class="panel" style="max-width:540px"><h2 style="font-family:Georgia,serif;font-size:18px;font-weight:700">Business details</h2>
  <div class="meta">
    <label class="f" style="grid-column:1/-1"><span>Business name</span><input class="inp" value="${esc(S.settings.biz)}" oninput="S.settings.biz=this.value;queueSave('settings')"></label>
    <label class="f" style="grid-column:1/-1"><span>Address</span><input class="inp" value="${esc(S.settings.addr)}" oninput="S.settings.addr=this.value;queueSave('settings')"></label>
    <label class="f"><span>Phone</span><input class="inp" value="${esc(S.settings.phone)}" oninput="S.settings.phone=this.value;queueSave('settings')"></label>
    <label class="f"><span>GSTIN</span><input class="inp" value="${esc(S.settings.gstin)}" oninput="S.settings.gstin=this.value;queueSave('settings')"></label>
    <label class="f"><span>Bill prefix</span><input class="inp" value="${esc(S.settings.prefix)}" oninput="S.settings.prefix=this.value;queueSave('settings')"></label>
  </div>
  <button class="btn" style="margin-top:12px" onclick="doSignOut()">Sign out</button></div>`}

function printLayer(){return `<div id="print"></div>`}
function copyWA(){const d=S.draft,t=calcTotals(d),ls=d.lines.filter(l=>l.name.trim()&&+l.qty>0)
  const txt=[S.settings.biz,'Bill '+d.no+' · '+dmy(d.date),d.customer?'To: '+d.customer:'','',
    ...ls.map(l=>`${l.name} — ${l.qty} ${l.unit} × ${money0(l.rate)} = ${money0(l.qty*l.rate)}`),
    '','TOTAL: '+money0(t.total)].filter((x,i)=>i<4||x).join('\n')
  navigator.clipboard.writeText(txt).then(()=>toast('Copied'),()=>toast('Copy failed'))
}

/* expose globals needed by inline handlers */
Object.assign(window,{go,setClient,addLine,delLine,doSaveBill,copyWA,acInput,acKey,pick,acBlur,rowKey,openPaste,closePaste,readList,chooseItem,applyPaste,renderModal,doSignIn,doSignOut,repriceLines,S,pasteRows,toast,inWords,money,money0,esc,uuid4})

boot()
