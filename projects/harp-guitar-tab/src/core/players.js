// Great blues harmonica players: who they were, how they played, records to hear, and
// where to find tabs and lessons. Facts only, each player with sources (searched Oct 2026).
// Where sources disagree the text says so; things no source confirmed are left out.
//
// `styles` are the lesson styles (styles.js) that draw on the player. `lessons` are pages
// with tabs or lessons by other people: linked, never copied. They were found by search
// and not opened from here, so the app labels them "not checked".

export const PLAYERS = [
  {
    id: "deford-bailey", name: "DeFord Bailey", years: "1899–1982", region: "Nashville, Tennessee",
    genre: "Pre-war harmonica soloist; first Black star of the Grand Ole Opry (1927–1941)", styles: ["train"],
    techniques: [
      "Train imitation: \"Pan American Blues\" recreates the L&N Pan-American express",
      "Fox-chase imitation, with whoops between harp phrases",
      "\"Odd little pulls and draws and cross-blowing\" (his biographer Charles Wolfe)",
    ],
    recordings: [
      { title: "Pan American Blues", year: 1927, note: "often called the first recorded harmonica blues solo" },
      { title: "Fox Chase", year: 1927 },
      { title: "Muscle Shoals Blues", year: 1927 },
    ],
    honors: "Country Music Hall of Fame, 2005",
    sources: ["https://countrymusichalloffame.org/artist/deford-bailey/", "https://adp.library.ucsb.edu/names/106276", "https://en.wikipedia.org/wiki/DeFord_Bailey", "https://www.npr.org/transcripts/5007645"],
    lessons: [
      { title: "Train rhythms (chugging)", url: "https://learntheharmonica.com/post/train-rhythms-chugging-harmonica-lesson-tabs" },
      { title: "Train starter lesson", url: "https://www.harmonica.com/starter-lessons/train/" },
      { title: "History of train imitation (J.J. Milteau)", url: "https://www.planetharmonica.com/ph2/VE/Train&HarmoUK.htm" },
    ],
  },
  {
    id: "noah-lewis", name: "Noah Lewis", years: "c. 1891–1961 (birth year disputed)", region: "Henning and Ripley, Tennessee; Memphis",
    genre: "Memphis jug band (Cannon's Jug Stompers)", styles: ["jug"],
    techniques: [
      "Played two harmonicas at once, one with the mouth and one with the nose",
      "A liquid tone, exceptional breath control and a huge volume",
      "Taught Hammie Nixon; probably passed the two-harp trick to Big Walter Horton",
    ],
    recordings: [
      { title: "Minglewood Blues", year: 1928, note: "Cannon's Jug Stompers" },
      { title: "Viola Lee Blues", year: 1928, note: "he sings and takes the harp solo" },
      { title: "Madison Street Rag", year: 1928 },
      { title: "New Minglewood Blues", year: 1930, note: "Noah Lewis' Jug Band" },
    ],
    honors: "Cannon's Jug Stompers: Memphis Music Hall of Fame",
    sources: ["https://en.wikipedia.org/wiki/Noah_Lewis_(musician)", "https://adp.library.ucsb.edu/names/106348", "https://memphismusichalloffame.com/inductee/cannons-jug-stompers/"],
    lessons: [],
  },
  {
    id: "will-shade", name: "Will Shade", years: "1898–1966 (some sources say 1893)", region: "Memphis",
    genre: "Memphis jug band (leader of the Memphis Jug Band)", styles: ["jug"],
    techniques: [
      "Played harmonica, guitar and washtub bass, and organized the Memphis Jug Band from 1926",
      "His country harp style is said to have influenced Big Walter and both Sonny Boys",
    ],
    recordings: [
      { title: "Sun Brimmer's Blues", year: 1927, note: "the band's first record" },
      { title: "Stealin', Stealin'", year: 1928 },
      { title: "K.C. Moan", year: 1929, note: "Shade on harmonica" },
    ],
    honors: "Blues Hall of Fame, 2016 (Memphis Jug Band)",
    sources: ["https://en.wikipedia.org/wiki/Will_Shade", "https://en.wikipedia.org/wiki/Memphis_Jug_Band", "https://adp.library.ucsb.edu/index.php/matrix/refer/800027283"],
    lessons: [],
  },
  {
    id: "hammie-nixon", name: "Hammie Nixon", years: "1908–1984", region: "Brownsville, Tennessee",
    genre: "Country blues; Sleepy John Estes's partner for about 50 years", styles: ["jug", "delta"],
    techniques: ["Learned from Noah Lewis", "An early influence on John Lee \"Sonny Boy\" Williamson I"],
    recordings: [
      { title: "Sleepy John Estes, Victor sessions", year: 1929 },
      { title: "Drop Down Mama (Sleepy John Estes)", year: 1935 },
      { title: "Someday Baby Blues (Sleepy John Estes)", year: 1935 },
    ],
    sources: ["https://en.wikipedia.org/wiki/Hammie_Nixon", "https://adpprod2.library.ucsb.edu/names/207294"],
    lessons: [],
  },
  {
    id: "sonny-terry", name: "Sonny Terry", years: "1911–1986", region: "Georgia and North Carolina; later New York",
    genre: "Piedmont blues and folk; with Blind Boy Fuller, then Brownie McGhee from about 1941", styles: ["piedmont", "train"],
    techniques: [
      "Falsetto whoops alternating with harp phrases, from the old tradition of imitating hunting dogs",
      "Driving rhythm chords (chugging), breath control (\"Lost John\")",
      "Hand effects; train and fox-chase pieces with whoops, stomping and single-note runs",
    ],
    recordings: [
      { title: "Fox Chase", note: "recorded several times" },
      { title: "Lost John" },
      { title: "Harmonica Train" },
      { title: "Lonesome Train" },
    ],
    honors: "Blues Hall of Fame, 1986; NEA National Heritage Fellowship",
    sources: ["https://en.wikipedia.org/wiki/Sonny_Terry", "https://www.culturalequity.org/alan-lomax/friends/terry", "https://bluesharmonica.com/sonny_terry", "https://www.arts.gov/honors/heritage/saunders-sonny-terry"],
    lessons: [
      { title: "Sonny Terry-style rhythm exercise \"Hotsy Totsy\"", url: "https://www.learntheharmonica.com/post/country-blues-harmonica-rhythm-exercise-hotsy-totsy-sonny-terry-free-harmonica-tabs-lesson" },
      { title: "Key to the Highway", url: "https://www.learntheharmonica.com/free-blues-jazz-tabs/key-to-the-highway" },
      { title: "Chugging for beginners", url: "https://www.learntheharmonica.com/post/harmonica-chugging-beginner-lesson" },
      { title: "Sonny Terry licks (Ben Hewlett, paid)", url: "https://playharmonica.teachable.com/courses/category/sonny-terry" },
    ],
  },
  {
    id: "johnny-woods", name: "Johnny Woods", years: "1917–1990", region: "Tate and Panola counties, North Mississippi",
    genre: "Hill country blues, with Mississippi Fred McDowell", styles: ["hill"],
    techniques: ["A \"pumping\" rhythmic harp under McDowell's one-chord slide drone", "Hand-muted cries and commentary"],
    recordings: [
      { title: "Mama Says I'm Crazy (with Fred McDowell)", note: "recorded by George Mitchell in 1967 (one review says 1965), released 2002" },
      { title: "Going Down to the River" },
    ],
    sources: ["https://en.wikipedia.org/wiki/Johnny_Woods", "https://blues-sessions.com/johnnywoods.php", "https://www.popmatters.com/mcdowellmississippifred-mama-2495988977.html"],
    lessons: [],
  },
  {
    id: "sonny-boy-i", name: "Sonny Boy Williamson I (John Lee Williamson)", years: "1914–1948", region: "Jackson, Tennessee; Chicago",
    genre: "Pre-war Chicago (Bluebird); the bridge from country to urban harp", styles: ["delta", "shuffle"],
    positions: "2nd position (\"crossed harp\")",
    techniques: [
      "Percussive tongue blocking with heavy slaps, splits and vibrato",
      "Close interplay between voice and harp",
      "Shaped Little Walter, Big Walter, Junior Wells and Muddy Waters",
    ],
    recordings: [
      { title: "Good Morning, School Girl", year: 1937 },
      { title: "Stop Breaking Down" },
      { title: "Shake the Boogie", year: 1947, note: "#4 on Billboard's race records chart" },
    ],
    honors: "Blues Hall of Fame, 1980",
    sources: ["https://en.wikipedia.org/wiki/Sonny_Boy_Williamson_I", "https://library3.tnstate.edu/library/digital/williams.htm", "https://forum.harmonica.com/t/sonny-boy-williamson-i-lecture-by-adam-gussow/18236"],
    lessons: [],
  },
  {
    id: "sonny-boy-ii", name: "Sonny Boy Williamson II (Rice Miller)", years: "birth disputed (1894–1912) – 1965", region: "Mississippi Delta; Helena, Arkansas; Chicago",
    genre: "Delta blues; King Biscuit Time radio from 1941; later Chess/Checker", styles: ["delta", "minor"],
    positions: "2nd (\"Help Me\": F minor on a B♭ harp) and 1st position (\"Trust My Baby\")",
    techniques: [
      "Sparse, vocal phrasing: timing and space",
      "Tone from thin and reedy to deep and fully choked",
      "Strong high-end 1st-position playing with blow bends",
      "Taught Howlin' Wolf the rudiments of the harp",
    ],
    recordings: [
      { title: "Eyesight to the Blind", year: 1951, note: "his first single (Trumpet)" },
      { title: "Don't Start Me Talkin'", note: "his first Checker single, #3 R&B" },
      { title: "Nine Below Zero" },
      { title: "Help Me" },
      { title: "Bring It On Home" },
    ],
    honors: "Blues Hall of Fame, 1980",
    sources: ["https://en.wikipedia.org/wiki/Sonny_Boy_Williamson_II", "https://www.bluesharmonica.com/sonny_boy_2", "https://harpsurgery.com/introduction-to-sonny-boy-ii-harmonica-technique"],
    lessons: [
      { title: "Help Me", url: "https://www.harmonica.com/help-me/" },
      { title: "Sonny Boy lick", url: "https://www.learntheharmonica.com/post/sonny-boy-williamson-lick-free-harmonica-lesson" },
      { title: "Keep It to Yourself", url: "https://www.learntheharmonica.com/free-sonny-boy-williamson-tabs/keep-it-to-yourself" },
      { title: "Introduction to Sonny Boy II technique", url: "https://harpsurgery.com/introduction-to-sonny-boy-ii-harmonica-technique" },
    ],
  },
  {
    id: "howlin-wolf", name: "Howlin' Wolf", years: "1910–1976", region: "Mississippi Delta; Memphis; Chicago",
    genre: "Delta to Chicago; harp in a neck rack while playing guitar", styles: ["delta"],
    techniques: ["Hard-driving, rhythmic, vocal harp", "Short two-bar phrases that echo the vocal (\"Smokestack Lightnin'\")", "Learned harp from Sonny Boy Williamson II"],
    recordings: [
      { title: "Moanin' at Midnight", year: 1951 },
      { title: "How Many More Years", year: 1951 },
      { title: "Smokestack Lightnin'", year: 1956 },
    ],
    honors: "Blues Hall of Fame, 1980; Rock and Roll Hall of Fame, 1991",
    sources: ["https://en.wikipedia.org/wiki/Howlin%27_Wolf", "https://ethanhein.com/wp/2021/smokestack-lightning/"],
    lessons: [{ title: "Smokestack Lightnin' (A harp)", url: "https://www.learntheharmonica.com/post/smokestack-lightning-by-howlin-wolf-free-harmonica-tabs-les" }],
  },
  {
    id: "little-walter", name: "Little Walter", years: "1930–1968 (birth year disputed)", region: "Louisiana; Chicago",
    genre: "Chicago amplified blues; Muddy Waters's band, then a Chess/Checker star", styles: ["shuffle", "slow"],
    positions: "Mostly 2nd (\"Juke\": E on an A harp); 3rd on chromatic (\"Blue Light\")",
    techniques: [
      "Cupped a small microphone with the harp and played through an amp, using its distortion",
      "Sax-like, jazz-influenced phrasing",
      "Tongue blocking: octaves and splits",
    ],
    recordings: [
      { title: "Juke", year: 1952, note: "#1 R&B, the only harmonica instrumental to top that chart" },
      { title: "Off the Wall" },
      { title: "Blues with a Feeling" },
      { title: "Sad Hours" },
      { title: "My Babe", note: "his most popular song" },
      { title: "Hoochie Coochie Man (Muddy Waters)", year: 1954, note: "harp" },
    ],
    honors: "Blues Hall of Fame, 1980; Rock and Roll Hall of Fame, 2008 (the only artist inducted for harmonica)",
    sources: ["https://en.wikipedia.org/wiki/Little_Walter", "https://www.britannica.com/biography/Little-Walter", "https://en.wikipedia.org/wiki/Juke_(instrumental)", "https://www.harmonica.com/best-of-little-walter/"],
    lessons: [
      { title: "Juke: opening riff", url: "https://www.learntheharmonica.com/post/little-walter-s-juke-opening-riff-free-harmonica-lesson-and-tabs" },
      { title: "Juke: chorus 1", url: "https://www.learntheharmonica.com/post/little-walter-s-juke-chorus-1-free-harmonica-lesson-and-tabs" },
      { title: "Juke, simplified first 12 bars", url: "https://jt30.com/blues/playjuke.html" },
      { title: "Off the Wall: first verse", url: "https://jt30.com/blues/playwall.html" },
      { title: "My Babe", url: "https://www.learntheharmonica.com/post/my-babe-by-little-walter-free-harmonica-lesson-and-tabs" },
      { title: "Best of Little Walter: key, harp and position per song", url: "https://www.harmonica.com/best-of-little-walter/" },
      { title: "Juke 1.0 (Adam Gussow, video)", url: "https://modernbluesharmonica.com/little_walter.html" },
    ],
  },
  {
    id: "big-walter", name: "Big Walter Horton", years: "1917/1921–1981 (birth year disputed)", region: "Memphis; Chicago",
    genre: "Memphis jug-band youth, then Chicago blues", styles: ["shuffle", "slow"],
    positions: "2nd (\"Easy\": F on a B♭ harp), also 1st and 3rd",
    techniques: [
      "Tongue blocking; widely regarded as having the best tone of any blues harp player",
      "Octaves, tongue flutter, slaps",
      "Willie Dixon called him the best harmonica player he ever heard",
    ],
    recordings: [
      { title: "Easy", year: 1953, note: "Sun; adapted from \"I Almost Lost My Mind\"" },
      { title: "Hard Hearted Woman" },
      { title: "Big Walter Horton with Carey Bell", year: 1972, note: "Alligator" },
    ],
    honors: "Blues Hall of Fame, 1982",
    sources: ["https://en.wikipedia.org/wiki/Big_Walter_Horton", "https://sunrecords.com/artists/big-walter-horton/", "https://celticguitarmusic.com/bw.htm"],
    lessons: [
      { title: "Easy", url: "https://www.learntheharmonica.com/free-big-walter-harmonica-tabs/easy" },
      { title: "Big Walter's Boogie (Glenn Weiser)", url: "https://celticguitarmusic.com/bw.htm" },
      { title: "Careless Love (Glenn Weiser)", url: "https://www.celticguitarmusic.com/harmcareless.htm" },
    ],
  },
  {
    id: "jimmy-reed", name: "Jimmy Reed", years: "1925–1976", region: "Mississippi; Chicago and Gary",
    genre: "Lazy hit-making shuffles on Vee-Jay", styles: ["reed"],
    positions: "1st position, high register, with blow bends on holes 8–10",
    techniques: ["Harp in a neck rack while playing guitar", "Simple solos that follow the vocal melody", "High blow bends: a thin, piercing tone"],
    recordings: [
      { title: "You Don't Have to Go", year: 1955 },
      { title: "Honest I Do", year: 1957 },
      { title: "Baby What You Want Me to Do" },
      { title: "Big Boss Man" },
      { title: "Bright Lights, Big City", year: 1961 },
    ],
    honors: "Blues Hall of Fame, 1980; Rock and Roll Hall of Fame",
    sources: ["https://en.wikipedia.org/wiki/Jimmy_Reed", "https://www.jt30.com/theory/first-position", "https://www.harpsurgery.com/how-to-play/blow-bends/"],
    lessons: [
      { title: "First position (theory and licks)", url: "https://www.jt30.com/theory/first-position" },
      { title: "Blow bends", url: "https://www.harpsurgery.com/how-to-play/blow-bends/" },
      { title: "Gussow lesson tabs, including \"You Don't Have to Go\" (fan PDFs)", url: "https://www.cs.bu.edu/fac/snyder/TablatureWeb/" },
    ],
  },
  {
    id: "junior-wells", name: "Junior Wells", years: "1934–1998", region: "Memphis; Chicago",
    genre: "Chicago blues; replaced Little Walter in Muddy Waters's band (1952); later with Buddy Guy", styles: ["shuffle", "minor"],
    techniques: ["A pucker (lip-pursing) player", "Amplified style after Little Walter", "Taught by Junior Parker and Sonny Boy Williamson II"],
    recordings: [
      { title: "Hoodoo Man", year: 1953 },
      { title: "Messin' with the Kid", year: 1960 },
      { title: "Hoodoo Man Blues (album)", year: 1965, note: "with Buddy Guy; National Recording Registry" },
    ],
    honors: "Blues Hall of Fame, 1998",
    sources: ["https://en.wikipedia.org/wiki/Junior_Wells", "https://en.wikipedia.org/wiki/Hoodoo_Man_Blues", "https://en.wikipedia.org/wiki/Messin%27_with_the_Kid"],
    lessons: [{ title: "Free blues tabs index (Hoodoo Man Blues, Messin' with the Kid…)", url: "https://www.learntheharmonica.com/free-blues-jazz-tabs" }],
  },
  {
    id: "james-cotton", name: "James Cotton", years: "1935–2017", region: "Tunica, Mississippi; Memphis; Chicago",
    genre: "Sun Records, Muddy Waters's band, then high-energy blues-rock", styles: ["shuffle", "boogie"],
    techniques: ["Aggressive amplified sound, mic cupped tight", "Tongue blocking"],
    recordings: [
      { title: "Cotton Crop Blues", year: 1954 },
      { title: "Got My Mojo Working (live, with Muddy Waters)" },
      { title: "Hard Again (Muddy Waters)", year: 1977 },
      { title: "Deep in the Blues", note: "Grammy, Best Traditional Blues Album" },
    ],
    honors: "Blues Hall of Fame, 2006",
    sources: ["https://en.wikipedia.org/wiki/James_Cotton", "https://thereelbluesfest.org/archive/artists/JamesCotton/TRBF-JamesCotton-discography.html"],
    lessons: [],
  },
  {
    id: "slim-harpo", name: "Slim Harpo", years: "1924–1970", region: "Baton Rouge, Louisiana",
    genre: "Swamp blues on Excello (producer Jay Miller, Crowley)", styles: ["swamp"],
    techniques: ["Laconic, \"declarative\" harp", "Groove-centred songs with short harp fills around the vocal"],
    recordings: [
      { title: "I'm a King Bee", year: 1957 },
      { title: "Rainin' in My Heart", year: 1961 },
      { title: "Baby Scratch My Back", year: 1966, note: "#1 R&B" },
    ],
    honors: "Blues Hall of Fame, 1985",
    sources: ["https://en.wikipedia.org/wiki/Slim_Harpo", "https://64parishes.org/entry/slim-harpo", "https://en.wikipedia.org/wiki/Baby_Scratch_My_Back"],
    lessons: [{ title: "Baby Scratch My Back, intro (Sonic Junction)", url: "https://sonicjunction.com/lessons/baby-scratch-my-back-intro-breakdown" }],
  },
  {
    id: "lazy-lester", name: "Lazy Lester", years: "1933–2018", region: "Louisiana",
    genre: "Swamp blues; Jay Miller's Crowley session band", styles: ["swamp"],
    techniques: ["Harp plus improvised percussion on sessions (newspapers, boxes)", "Relaxed harp with a country tinge"],
    recordings: [{ title: "I'm a Lover Not a Fighter", note: "Excello, 1957 or 1958" }, { title: "Sugar Coated Love" }],
    honors: "Blues Hall of Fame, 2012",
    sources: ["https://en.wikipedia.org/wiki/Lazy_Lester", "https://alligator.com/artists/Lazy-Lester"],
    lessons: [],
  },
  {
    id: "paul-butterfield", name: "Paul Butterfield", years: "1942–1987", region: "Chicago",
    genre: "Electric Chicago blues to blues-rock and jazz (East-West)", styles: ["shuffle", "boogie"],
    techniques: ["Mainly a pucker player, tongue blocking for octaves", "Strong, fast vibrato; slightly bent two-note combinations", "Didn't repeat himself across choruses"],
    recordings: [
      { title: "The Paul Butterfield Blues Band", year: 1965 },
      { title: "East-West", year: 1966 },
      { title: "Bob Dylan's electric set at Newport", year: 1965 },
    ],
    honors: "Blues Hall of Fame, 2006; Rock and Roll Hall of Fame, 2015",
    sources: ["https://en.wikipedia.org/wiki/Paul_Butterfield", "https://www.bluesharmonica.com/more_paul_butterfield"],
    lessons: [],
  },
  {
    id: "charlie-musselwhite", name: "Charlie Musselwhite", years: "born 1944", region: "Mississippi; Memphis; Chicago; California",
    genre: "Chicago blues with Delta roots", styles: ["slow", "minor"],
    positions: "Known for 3rd position (\"Cristo Redentor\")",
    techniques: ["Long, controlled draw bends with vibrato"],
    recordings: [
      { title: "Stand Back! Here Comes Charley Musselwhite's Southside Band", note: "Vanguard, 1966/67" },
      { title: "Cristo Redentor" },
      { title: "Get Up! (with Ben Harper)", note: "Grammy, Best Blues Album" },
    ],
    honors: "Blues Hall of Fame, 2010",
    sources: ["https://en.wikipedia.org/wiki/Charlie_Musselwhite", "https://www.bluesharmonica.com/charlie_musselwhite"],
    lessons: [],
  },
  {
    id: "carey-bell", name: "Carey Bell", years: "1936–2007", region: "Mississippi; Chicago",
    genre: "Chicago blues; learned in person from Big Walter, Little Walter and Sonny Boy II", styles: ["shuffle"],
    techniques: ["\"Chopped\", punchy, jazz-like phrasing"],
    recordings: [
      { title: "Carey Bell's Blues Harp", year: 1969 },
      { title: "Big Walter Horton with Carey Bell", year: 1972 },
      { title: "Harp Attack! (with Cotton, Wells, Branch)" },
    ],
    honors: "Blues Hall of Fame, 2023",
    sources: ["https://en.wikipedia.org/wiki/Carey_Bell", "https://www.alligator.com/artists/Carey-Bell"],
    lessons: [],
  },
  {
    id: "george-smith", name: "George \"Harmonica\" Smith", years: "1924–1983", region: "Helena, Arkansas; Chicago; Los Angeles",
    genre: "West Coast blues; mentor of William Clarke and Rod Piazza", styles: ["slow"],
    positions: "3rd position, especially on chromatic",
    techniques: ["Chromatic octaves for an organ-like sound", "\"Fat tones, chords and octaves\" (William Clarke)"],
    recordings: [{ title: "Blues in the Dark" }, { title: "Telephone Blues" }, { title: "No Time for Jive", year: 1969 }],
    honors: "Blues Hall of Fame, 2020",
    sources: ["https://en.wikipedia.org/wiki/George_%22Harmonica%22_Smith", "https://www.bluesjunctionproductions.com/george_harmonica_smith"],
    lessons: [],
  },
  {
    id: "snooky-pryor", name: "Snooky Pryor", years: "1919/1921–2006", region: "Mississippi; Chicago",
    genre: "Postwar Chicago (Maxwell Street)", styles: ["shuffle", "boogie"],
    techniques: ["Claimed to have pioneered the hand-cupped microphone (disputed: his earliest records don't use it)"],
    recordings: [{ title: "Telephone Blues", year: 1948 }, { title: "Snooky & Moody's Boogie", year: 1948 }, { title: "Judgment Day", year: 1956 }],
    honors: "Blues Hall of Fame, 2023",
    sources: ["https://en.wikipedia.org/wiki/Snooky_Pryor", "https://www.bear-family.com/pryor-snooky/"],
    lessons: [],
  },
  {
    id: "kim-wilson", name: "Kim Wilson", years: "born 1951", region: "California; Austin, Texas",
    genre: "Fabulous Thunderbirds; classic Chicago-style harp", styles: ["shuffle", "swamp"],
    techniques: ["Tongue blocking", "Tremolo rather than vibrato, for a classic sound"],
    recordings: [{ title: "Tuff Enuff", year: 1986 }, { title: "Take Me Back! (The Bigtone Sessions)", year: 2020 }],
    honors: "Blues Music Awards, including harmonica player",
    sources: ["https://en.wikipedia.org/wiki/Kim_Wilson", "https://www.npr.org/2003/06/21/1305432/the-fabulous-kim-wilson", "https://www.bluesharmonica.com/kim_wilson_warble"],
    lessons: [{ title: "Kim Wilson warble (shake)", url: "https://www.bluesharmonica.com/kim_wilson_warble" }],
  },
];

/** Sites with free tabs and lessons, for finding tabs to paste into the app. */
export const TAB_SITES = [
  { name: "LearnTheHarmonica", url: "https://www.learntheharmonica.com/free-blues-jazz-tabs", notation: "-4 = draw, ' = bend" },
  { name: "HarpTabs (user tabs)", url: "https://www.harptabs.com/", notation: "-4 = draw" },
  { name: "harmonica.com lessons", url: "https://www.harmonica.com/", notation: "-4 = draw, ' = bend" },
  { name: "BluesHarmonica.com (David Barrett)", url: "https://www.bluesharmonica.com/", notation: "4 = draw, 4+ = blow, ' = bend" },
  { name: "jt30.com", url: "https://jt30.com/", notation: "varies by page" },
  { name: "Glenn Weiser transcriptions", url: "https://celticguitarmusic.com/Masterstoc.htm", notation: "tab + standard notation" },
  { name: "Gussow lesson tabs (fan PDFs)", url: "https://www.cs.bu.edu/fac/snyder/TablatureWeb/", notation: "bends drawn as bent arrows" },
  { name: "Pat Missin (history, tunings)", url: "https://www.patmissin.com/", notation: "reference" },
];

/** Players by id. */
export const playerById = (id) => PLAYERS.find((p) => p.id === id);

/** Players who shaped a lesson style. */
export const playersForStyle = (style) => PLAYERS.filter((p) => p.styles.includes(style));
