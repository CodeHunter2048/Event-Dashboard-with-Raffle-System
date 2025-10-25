'use client';
import { attendees } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

// CSS for the scrolling animation
const styles = `
  @keyframes scroll {
    0% { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }
  .scrolling-list {
    animation: scroll 60s linear infinite;
  }
`;

export default function DisplayPage() {
  const checkedInAttendees = attendees.filter(a => a.checkedIn);
  return (
    <>
      <style>{styles}</style>
      <div className="flex h-screen flex-col items-center justify-center p-4 lg:p-8 space-y-8 bg-gradient-to-br from-background via-slate-900 to-blue-950">
        <header className="text-center max-w-5xl">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
              AI for IA
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-blue-200 mb-6">
              Uniting Industry-Academia through Artificial Intelligence
            </h2>
            <p className="text-xl md:text-2xl text-slate-300">
                Welcome delegates!
            </p>
        </header>

        <div className="grid lg:grid-cols-3 gap-8 w-full max-w-7xl">
          <main className="lg:col-span-2 h-[60vh] overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-slate-900/100 to-transparent z-10" />
             <div className="scrolling-list">
              {[...checkedInAttendees, ...checkedInAttendees].map((attendee, index) => {
                 const avatar = PlaceHolderImages.find(p => p.id === `avatar${attendee.avatar}`);
                 return (
                  <Card key={`${attendee.id}-${index}`} className="mb-4 bg-slate-800/50 backdrop-blur-sm border-slate-700">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-slate-600">
                        {avatar && <AvatarImage src={avatar.imageUrl} alt={attendee.name} data-ai-hint={avatar.imageHint} />}
                        <AvatarFallback className="bg-slate-700 text-slate-300">{attendee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-lg text-white">{attendee.name}</p>
                        <p className="text-slate-400">{attendee.organization}</p>
                      </div>
                    </CardContent>
                  </Card>
                 )
              })}
             </div>
             <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-slate-900/100 to-transparent z-10" />
          </main>

          <aside className="lg:col-span-1 flex flex-col justify-center">
             <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-center">
                <CardHeader>
                    <CardTitle className="text-2xl text-cyan-400">Attendees Checked In</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-7xl lg:text-8xl font-bold text-white">
                        {checkedInAttendees.length}
                        <span className="text-4xl text-slate-400">/ {attendees.length}</span>
                    </p>
                </CardContent>
             </Card>
          </aside>
        </div>
      </div>
    </>
  );
}
