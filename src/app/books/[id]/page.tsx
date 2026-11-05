import { BookReaderClient } from "@/components/BookReaderClient";

type Props = { params: Promise<{ id: string }> };

export default async function BookPage({ params }: Props) {
  const { id } = await params;
  return <BookReaderClient bookId={id} />;
}
