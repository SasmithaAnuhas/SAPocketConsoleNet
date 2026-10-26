/**
 * Kenny Adventure - Level 2: Template Map Module
 * Contains visual asset mappings and 64x64 grid layout.
 */
window.CURRENT_LEVEL_MAP = {
    name: "Level 2: Template",
    tileSize: 64,
    assets: {
        '#': 'terrain_grass_block.png',
        'B': 'terrain_grass_block_center.png',
        '[': 'terrain_grass_horizontal_left.png',
        '=': 'terrain_grass_horizontal_middle.png',
        ']': 'terrain_grass_horizontal_right.png',
        '?': 'block_coin.png',
        '!': 'block_exclamation.png',
        'E': 'block_empty.png',
        '~': 'water_top.png',
        '^': 'spikes.png',
        'J': 'spring.png',
        'C': 'coin_gold.png',
        'G': 'gem_blue.png',
        'H': 'heart.png',
        'F': 'flag_green_a.png',
        'P': 'character_green_idle.png',
        'S': 'slime_normal_walk_a.png',
        'W': 'bee_a.png',
        '>': 'sign_right.png',
        'X': 'sign_exit.png'
    },
    grid: [
/*  0 */ "....................................................................................................",
/*  1 */ "....................................................................................................",
/*  2 */ "....................................................................................................",
/*  3 */ "....................................................................................................",
/*  4 */ "....................................................................................................",
/*  5 */ "....................................................................................................",
/*  6 */ "............................................................................................#####...",
/*  7 */ "..........................................................................................#######...",
/*  8 */ "...P.>..................................................................................X.#########...",
/*  9 */ "####################################################################################################",
/* 10 */ "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
/* 11 */ "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
    ]
};
