import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';

interface PhotoUpload {
  file: File | null;
  preview: string | null;
}

interface CompatibilityResult {
  groomIndex: number;
  percentage: number;
}

interface PhotoAnalysis {
  category: 'portrait' | 'car' | 'apartment' | 'unknown';
  confidence: number;
}

const Index = () => {
  const [bridePhoto, setBridePhoto] = useState<PhotoUpload>({ file: null, preview: null });
  const [groomPhotos, setGroomPhotos] = useState<PhotoUpload[]>([
    { file: null, preview: null },
    { file: null, preview: null },
    { file: null, preview: null },
  ]);
  const [results, setResults] = useState<CompatibilityResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [error, setError] = useState<string>('');

  const handleBridePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Пожалуйста, загрузите изображение');
        return;
      }
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setBridePhoto({ file, preview: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGroomPhotoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Пожалуйста, загрузите изображение');
        return;
      }
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        const newGroomPhotos = [...groomPhotos];
        newGroomPhotos[index] = { file, preview: reader.result as string };
        setGroomPhotos(newGroomPhotos);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzePhoto = async (photoPreview: string): Promise<PhotoAnalysis> => {
    try {
      const base64Data = photoPreview.split(',')[1];
      
      const response = await fetch('https://functions.poehali.dev/d65ae10e-b4fb-4333-9270-d6497fdbd6f6', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_base64: base64Data }),
      });

      if (!response.ok) {
        return { category: 'portrait', confidence: 0.5 };
      }

      const data = await response.json();
      return data as PhotoAnalysis;
    } catch (error) {
      console.error('Photo analysis error:', error);
      return { category: 'portrait', confidence: 0.5 };
    }
  };

  const calculateCompatibility = async () => {
    if (!bridePhoto.file || groomPhotos.some(g => !g.file)) {
      setError('Пожалуйста, загрузите все фотографии');
      return;
    }

    setIsCalculating(true);
    setCalculationProgress(0);
    setError('');

    const progressInterval = setInterval(() => {
      setCalculationProgress(prev => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return 85;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const groomAnalyses = await Promise.all(
        groomPhotos.map(groom => groom.preview ? analyzePhoto(groom.preview) : Promise.resolve({ category: 'portrait' as const, confidence: 0 }))
      );

      clearInterval(progressInterval);
      setCalculationProgress(100);

      const allPortraits = groomAnalyses.every(analysis => analysis.category === 'portrait');

      const calculatedResults: CompatibilityResult[] = groomPhotos.map((_, index) => {
        const analysis = groomAnalyses[index];

        if (allPortraits) {
          return {
            groomIndex: index,
            percentage: 33,
          };
        }

        if (analysis.category === 'car' || analysis.category === 'apartment') {
          const highPercentage = 75 + Math.random() * 20;
          return {
            groomIndex: index,
            percentage: Math.round(Math.min(95, highPercentage)),
          };
        }

        const lowPercentage = 30 + Math.random() * 15;
        return {
          groomIndex: index,
          percentage: Math.round(lowPercentage),
        };
      });

      calculatedResults.sort((a, b) => b.percentage - a.percentage);

      setTimeout(() => {
        setResults(calculatedResults);
        setIsCalculating(false);
        setCalculationProgress(0);
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setError('Ошибка при анализе фотографий');
      setIsCalculating(false);
      setCalculationProgress(0);
    }
  };

  const resetAll = () => {
    setBridePhoto({ file: null, preview: null });
    setGroomPhotos([
      { file: null, preview: null },
      { file: null, preview: null },
      { file: null, preview: null },
    ]);
    setResults([]);
    setCalculationProgress(0);
    setError('');
  };

  const allPhotosUploaded = bridePhoto.file && groomPhotos.every(g => g.file);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold text-primary-foreground mb-4">
            💕 Калькулятор Совместимости
          </h1>
          <p className="text-lg text-muted-foreground">
            Загрузите фотографии и узнайте процент совместимости
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center animate-scale-in">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow animate-fade-in">
            <h2 className="text-2xl font-semibold text-primary-foreground mb-4 flex items-center gap-2">
              <Icon name="Heart" size={28} className="text-primary" />
              Невеста
            </h2>
            <div className="space-y-4">
              <div className="relative aspect-square bg-accent rounded-lg overflow-hidden border-2 border-dashed border-primary/30 hover:border-primary transition-colors">
                {bridePhoto.preview ? (
                  <img
                    src={bridePhoto.preview}
                    alt="Невеста"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                    <Icon name="User" size={48} className="mb-2 text-primary/50" />
                    <p className="text-sm">Загрузите фото невесты</p>
                  </div>
                )}
              </div>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBridePhotoUpload}
                  className="hidden"
                  id="bride-upload"
                />
                <Button
                  onClick={() => document.getElementById('bride-upload')?.click()}
                  variant="outline"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  type="button"
                >
                  <Icon name="Upload" size={20} className="mr-2" />
                  Выбрать фото
                </Button>
              </label>
            </div>
          </Card>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-primary-foreground mb-4 flex items-center gap-2">
              <Icon name="Users" size={28} className="text-secondary" />
              Женихи
            </h2>
            {groomPhotos.map((groom, index) => (
              <Card
                key={index}
                className="p-4 bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex gap-4">
                  <div className="relative w-24 h-24 bg-accent rounded-lg overflow-hidden border-2 border-dashed border-secondary/30 hover:border-secondary transition-colors flex-shrink-0">
                    {groom.preview ? (
                      <img
                        src={groom.preview}
                        alt={`Жених ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon name="User" size={32} className="text-secondary/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-sm font-medium text-primary-foreground mb-2">
                      Жених {index + 1}
                    </p>
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleGroomPhotoUpload(index, e)}
                        className="hidden"
                        id={`groom-upload-${index}`}
                      />
                      <Button
                        onClick={() => document.getElementById(`groom-upload-${index}`)?.click()}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        type="button"
                      >
                        <Icon name="Upload" size={16} className="mr-2" />
                        Выбрать фото
                      </Button>
                    </label>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex gap-4 justify-center mb-8">
          <Button
            onClick={calculateCompatibility}
            disabled={!allPhotosUploaded || isCalculating}
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
          >
            {isCalculating ? (
              <>
                <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                Анализирую...
              </>
            ) : (
              <>
                <Icon name="Sparkles" size={20} className="mr-2" />
                Рассчитать совместимость
              </>
            )}
          </Button>
          {(allPhotosUploaded || results.length > 0) && !isCalculating && (
            <Button onClick={resetAll} variant="outline" size="lg">
              <Icon name="RotateCcw" size={20} className="mr-2" />
              Начать заново
            </Button>
          )}
        </div>

        {isCalculating && (
          <Card className="max-w-3xl mx-auto p-8 bg-white/90 backdrop-blur-sm shadow-xl mb-8 animate-scale-in">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-primary-foreground mb-2">
                  Анализируем совместимость...
                </h3>
                <p className="text-muted-foreground mb-4">
                  Прогресс: {Math.round(calculationProgress)}%
                </p>
                <Progress value={calculationProgress} className="h-3 mb-6" />
              </div>
              
              <div className="flex justify-center">
                <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden shadow-lg">
                  <img 
                    src="https://cdn.poehali.dev/files/Yule4TxCtW0.jpg" 
                    alt="Анализ" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p className="animate-pulse-slow">Пожалуйста, подождите...</p>
              </div>
            </div>
          </Card>
        )}

        {results.length > 0 && !isCalculating && (
          <div className="space-y-4 animate-scale-in">
            <h2 className="text-3xl font-bold text-center text-primary-foreground mb-6">
              🎯 Результаты совместимости
            </h2>
            {results.map((result, index) => (
              <Card
                key={result.groomIndex}
                className="p-6 bg-white/90 backdrop-blur-sm shadow-lg animate-fade-in"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="flex items-center gap-6">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-primary flex-shrink-0">
                    {groomPhotos[result.groomIndex].preview && (
                      <img
                        src={groomPhotos[result.groomIndex].preview}
                        alt={`Жених ${result.groomIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold text-primary-foreground">
                        Жених {result.groomIndex + 1}
                      </h3>
                      <span className="text-3xl font-bold text-primary">
                        {result.percentage}%
                      </span>
                    </div>
                    <Progress value={result.percentage} className="h-3" />
                    {index === 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        ⭐ Лучшая совместимость!
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;