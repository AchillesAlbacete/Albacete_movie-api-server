import sqlite3

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

cursor.execute('''
CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    year INTEGER NOT NULL,
    genre TEXT NOT NULL
)
''')

# Starter library (30 titles total)
initial_movies = [
    ('The Shawshank Redemption', 1994, 'Drama'),
    ('The Godfather', 1972, 'Crime'),
    ('The Dark Knight', 2008, 'Action'),
    ('Pulp Fiction', 1994, 'Crime'),
    ('Inception', 2010, 'Sci-Fi'),
    ('Fight Club', 1999, 'Drama'),
    ('Forrest Gump', 1994, 'Drama'),
    ('The Matrix', 1999, 'Sci-Fi'),
    ('Goodfellas', 1990, 'Crime'),
    ('Interstellar', 2014, 'Sci-Fi'),
    ('Spirited Away', 2001, 'Animation'),
    ('Parasite', 2019, 'Thriller'),
    ('Gladiator', 2000, 'Action'),
    ('Whiplash', 2014, 'Drama'),
    ('The Prestige', 2006, 'Mystery'),
    ('Jurassic Park', 1993, 'Adventure'),
    ('The Lord of the Rings: The Fellowship of the Ring', 2001, 'Fantasy'),
    ('The Silence of the Lambs', 1991, 'Thriller'),
    ('Casablanca', 1942, 'Romance'),
    ('Back to the Future', 1985, 'Sci-Fi'),
    ('The Truman Show', 1998, 'Comedy'),
    ('The Grand Budapest Hotel', 2014, 'Comedy'),
    ('Everything Everywhere All at Once', 2022, 'Sci-Fi'),
    ('The Social Network', 2010, 'Drama'),
    ('Mad Max: Fury Road', 2015, 'Action'),
    ('Coco', 2017, 'Animation'),
    ('The Departed', 2006, 'Crime'),
    ('12 Angry Men', 1957, 'Drama'),
    ('The Lion King', 1994, 'Animation'),
    ('Dune', 2021, 'Sci-Fi')
]

# Add missing seed records without duplicating existing movies. A parenthetical
# edition suffix (for example, "(Extended)") still counts as the same title.
def normalized_title(title):
    return title.casefold().split(' (', 1)[0].strip()

existing_titles = {
    normalized_title(row[0])
    for row in cursor.execute('SELECT title FROM movies').fetchall()
}
added_count = 0
for title, year, genre in initial_movies:
    normalized = normalized_title(title)
    if normalized not in existing_titles:
        cursor.execute(
            'INSERT INTO movies (title, year, genre) VALUES (?, ?, ?)',
            (title, year, genre),
        )
        existing_titles.add(normalized)
        added_count += 1

conn.commit()
conn.close()
print(f"Database ready: added {added_count} movies; starter library has 30 titles.")