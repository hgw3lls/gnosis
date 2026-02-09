import { findIsbn13ByTitleAuthor } from "../src/services/isbnLookup";

const samples = [
  { title: "The Hobbit", author: "J.R.R. Tolkien" },
  { title: "Pride and Prejudice", author: "Jane Austen" },
  { title: "The Left Hand of Darkness", author: "Ursula K. Le Guin" },
];

const run = async () => {
  for (const sample of samples) {
    const result = await findIsbn13ByTitleAuthor({
      title: sample.title,
      author: sample.author,
      googleApiKey: process.env.VITE_GOOGLE_BOOKS_API_KEY,
    });
    console.log(
      JSON.stringify(
        {
          query: sample,
          isbn13: result.isbn13,
          confidence: result.confidence,
          candidate: result.candidate,
        },
        null,
        2
      )
    );
  }
};

void run();
