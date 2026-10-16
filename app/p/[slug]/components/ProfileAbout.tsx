// About: "Sobre mí" with an italic word, plus the experience paragraph when present.
// Only rendered when bio or experience_description exists.

interface ProfileAboutProps {
  bio: string | null
  experienceDescription: string | null
}

export function ProfileAbout({ bio, experienceDescription }: ProfileAboutProps) {
  if (!bio && !experienceDescription) return null

  return (
    <section className="space-y-7">
      {bio && (
        <div>
          <h2 className="font-almanac-serif text-[30px] leading-[1.05] text-foreground">
            Sobre <em>mí</em>
          </h2>
          <p className="font-almanac text-base leading-[1.7] text-gray-800 mt-3">{bio}</p>
        </div>
      )}

      {experienceDescription && (
        <div>
          <h2 className="font-almanac-serif text-[30px] leading-[1.05] text-foreground">
            Sobre la <em>experiencia</em>
          </h2>
          <p className="font-almanac text-base leading-[1.7] text-gray-800 mt-3">{experienceDescription}</p>
        </div>
      )}
    </section>
  )
}
