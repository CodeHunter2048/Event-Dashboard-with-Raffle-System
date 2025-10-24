import Image from 'next/image';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { prizes } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function PrizesPage() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prizes</h1>
          <p className="text-muted-foreground">
            Configure prizes for the random drawing.
          </p>
        </div>
        <Button className="gap-1">
          <PlusCircle className="h-4 w-4" />
          Add Prize
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {prizes.map((prize) => {
          const image = PlaceHolderImages.find((p) => p.id === prize.image);
          return (
            <Card key={prize.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant={prize.tier === 'Grand' ? 'default' : prize.tier === 'Major' ? 'secondary' : 'outline' } className="mb-2">{prize.tier} Prize</Badge>
                    <CardTitle>{prize.name}</CardTitle>
                  </div>
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription>{prize.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {image && (
                  <Image
                    alt={prize.name}
                    className="aspect-video w-full rounded-md object-cover"
                    height="300"
                    src={image.imageUrl}
                    width="400"
                    data-ai-hint={image.imageHint}
                  />
                )}
              </CardContent>
              <CardFooter>
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{prize.remaining} of {prize.quantity}</span> remaining
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
