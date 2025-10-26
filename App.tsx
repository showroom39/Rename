import React, { useState, useCallback, DragEvent, ChangeEvent, useEffect, useRef } from 'react';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const renameFormats = [
    { id: 'date_codename_name', label: 'YYYYMMDD_CODENAME_FileName' },
    { id: 'date_name', label: 'YYYYMMDD_FileName' },
    { id: 'codename_date_name', label: 'CODENAME_YYYYMMDD_FileName' },
    { id: 'name_date', label: 'FileName_YYYYMMDD' },
];

const UploadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

const FileIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
);

const InfoIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
);

interface RenamedFile {
    originalFile: File;
    newName: string;
    dateString: string;
    previewUrl?: string;
}

const App: React.FC = () => {
    const [renamedFiles, setRenamedFiles] = useState<RenamedFile[]>([]);
    const [isDraggingOverList, setIsDraggingOverList] = useState<boolean>(false);
    const [codename, setCodename] = useState<string>('PROJECT');
    const [format, setFormat] = useState<string>('date_codename_name');
    const [dateString, setDateString] = useState<string>(new Date().toISOString().split('T')[0]);
    const [useSameDateForAll, setUseSameDateForAll] = useState<boolean>(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Effect for cleaning up Object URLs
    useEffect(() => {
        return () => {
            renamedFiles.forEach(rf => {
                if (rf.previewUrl) {
                    URL.revokeObjectURL(rf.previewUrl);
                }
            });
        };
    }, [renamedFiles]);

    // Main effect for generating new names whenever a relevant piece of state changes
    useEffect(() => {
        if (renamedFiles.length === 0) return;

        const code = codename.trim() || 'CODENAME';

        setRenamedFiles(currentFiles => 
            currentFiles.map(file => {
                const dateForCalc = useSameDateForAll ? dateString : file.dateString;
                const date = dateForCalc.replace(/-/g, '');
                const name = file.originalFile.name;
                let generatedName = '';

                switch (format) {
                    case 'date_codename_name':
                        generatedName = `${date}_${code}_${name}`;
                        break;
                    case 'date_name':
                        generatedName = `${date}_${name}`;
                        break;
                    case 'codename_date_name':
                        generatedName = `${code}_${date}_${name}`;
                        break;
                    case 'name_date':
                        const parts = name.split('.');
                        if (parts.length > 1) {
                            const ext = parts.pop();
                            generatedName = `${parts.join('.')}_${date}.${ext}`;
                        } else {
                            generatedName = `${name}_${date}`;
                        }
                        break;
                    default:
                        generatedName = `${date}_${name}`;
                }

                return { ...file, newName: generatedName };
            })
        );
    }, [format, codename, dateString, useSameDateForAll, renamedFiles.length]);
    
    const handleFiles = useCallback((selectedFiles: FileList | null) => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        const newFiles = Array.from(selectedFiles);
        let currentGlobalDate = dateString;

        // If this is the first batch of files, set the global date from the first file.
        if (renamedFiles.length === 0) {
            const firstFile = newFiles[0];
            const fileModifiedDate = new Date(firstFile.lastModified);
            currentGlobalDate = fileModifiedDate.toISOString().split('T')[0];
            setDateString(currentGlobalDate);
        }

        const filesToAdd: RenamedFile[] = newFiles.map(file => {
            const individualFileDate = new Date(file.lastModified).toISOString().split('T')[0];
            return {
                originalFile: file,
                newName: '', // Will be calculated in useEffect
                previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
                dateString: useSameDateForAll ? currentGlobalDate : individualFileDate,
            };
        });

        setRenamedFiles(prev => [...prev, ...filesToAdd]);
    }, [renamedFiles.length, dateString, useSameDateForAll]);


    const preventDefaults = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    const handleListDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
        preventDefaults(e);
        setIsDraggingOverList(true);
    }, []);

    const handleListDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
        preventDefaults(e);
        setIsDraggingOverList(false);
    }, []);

    const handleListDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
        preventDefaults(e);
        setIsDraggingOverList(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
    }, [handleFiles]);
    
    const handleIndividualNameChange = (index: number, newName: string) => {
        setRenamedFiles(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], newName };
            return updated;
        });
    };
    
    const handleIndividualDateChange = (index: number, newDate: string) => {
        setRenamedFiles(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], dateString: newDate };
            return updated;
        });
    };

    const handleDateToggleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setUseSameDateForAll(isChecked);

        // If toggling back to global, sync all dates.
        // If toggling to individual, revert all to their original last modified date.
        setRenamedFiles(prev => prev.map(rf => ({
            ...rf,
            dateString: isChecked 
                ? dateString 
                : new Date(rf.originalFile.lastModified).toISOString().split('T')[0]
        })));
    };

    const handleSaveAll = useCallback(() => {
        renamedFiles.forEach((renamedFile, index) => {
            if (!renamedFile.originalFile || !renamedFile.newName.trim()) return;

            setTimeout(() => {
                const blob = new Blob([renamedFile.originalFile], { type: renamedFile.originalFile.type });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = renamedFile.newName.trim();
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, index * 300);
        });
    }, [renamedFiles]);

    const handleClear = useCallback(() => {
        setRenamedFiles([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    const openFilePicker = () => {
        fileInputRef.current?.click();
    }
    
    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4">
            <div className="w-full max-w-6xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                        File Renamer & Saver
                    </h1>
                    <p className="text-gray-400 mt-2 text-lg">Drop files, customize their names, and save.</p>
                </header>
                
                <main className="bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 transition-all duration-300">
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        multiple
                    />
                    <div className="animate-fade-in">
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                                <h3 className="text-2xl font-bold mb-4 text-gray-100">Rename Options</h3>
                                
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <label htmlFor="date-picker" className="text-sm font-medium text-gray-400">Select Date</label>
                                        <div className="flex items-center">
                                            <label htmlFor="date-toggle" className="text-xs text-gray-400 mr-2 cursor-pointer">Use for all</label>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="date-toggle" className="sr-only peer" checked={useSameDateForAll} onChange={handleDateToggleChange} />
                                                <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                    {useSameDateForAll && (
                                        <input
                                            id="date-picker"
                                            type="date"
                                            value={dateString}
                                            onChange={(e) => setDateString(e.target.value)}
                                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition animate-fade-in-fast"
                                        />
                                    )}
                                </div>

                                <div className="mb-4">
                                    <label htmlFor="format-select" className="text-sm font-medium text-gray-400 block mb-1">Rename Format</label>
                                    <select
                                        id="format-select"
                                        value={format}
                                        onChange={(e) => setFormat(e.target.value)}
                                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                                    >
                                        {renameFormats.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                    </select>
                                </div>

                                {format.includes('codename') && (
                                    <div className="mb-4 animate-fade-in-fast">
                                        <label htmlFor="codename" className="text-sm font-medium text-gray-400 block mb-1">Codename / Stage</label>
                                        <input
                                            id="codename"
                                            type="text"
                                            value={codename}
                                            onChange={(e) => setCodename(e.target.value)}
                                            placeholder="e.g., DRAFT, FINAL, PROJ-X"
                                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                                        />
                                    </div>
                                )}
                                 <div className="mt-6 flex flex-col gap-4">
                                    <button
                                        onClick={handleSaveAll}
                                        disabled={renamedFiles.length === 0}
                                        className="w-full text-white font-bold py-3 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Download All Files ({renamedFiles.length})
                                    </button>
                                    <button
                                        onClick={handleClear}
                                        className="w-full text-gray-300 font-bold py-3 px-6 rounded-lg bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-400 transition-all duration-300"
                                    >
                                        Clear and Start Over
                                    </button>
                                </div>
                                <div className="mt-4 p-3 bg-gray-700/50 rounded-lg text-xs text-gray-400 flex items-start gap-2">
                                    <InfoIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>Files will be saved to your browser's default download folder one by one.</span>
                                </div>
                            </div>
                            <div 
                                className={`lg:col-span-2 rounded-2xl transition-all duration-300 relative border-2 border-dashed cursor-pointer ${isDraggingOverList ? 'border-purple-500 bg-gray-900/50' : 'border-gray-600 hover:border-purple-400'}`}
                                onDragEnter={handleListDragEnter}
                                onDragOver={handleListDragEnter}
                                onDragLeave={handleListDragLeave}
                                onDrop={handleListDrop}
                                onClick={openFilePicker}
                            >
                                {isDraggingOverList && (
                                    <div className="absolute inset-0 bg-gray-800/80 rounded-2xl flex flex-col items-center justify-center z-10 animate-fade-in-fast pointer-events-none">
                                        <UploadIcon className="w-16 h-16 mb-4 text-purple-400" />
                                        <p className="text-xl font-semibold text-gray-300">
                                            Drop to add more files
                                        </p>
                                    </div>
                                )}
                                {renamedFiles.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center text-center p-10 h-full min-h-[400px]">
                                        <UploadIcon className="w-16 h-16 mb-4 text-gray-500" />
                                        <p className="text-xl font-semibold text-gray-300">
                                            Drag & drop your file(s) here
                                        </p>
                                        <p className="text-gray-500">or click to select files</p>
                                    </div>
                                ) : (
                                    <div className="p-6">
                                        <h2 className="text-2xl font-bold mb-4 text-gray-100">Files to Rename ({renamedFiles.length})</h2>
                                        <div className="space-y-3 max-h-[calc(60vh-4.25rem)] overflow-y-auto pr-2">
                                            {renamedFiles.map((rf, index) => (
                                                <div key={`${rf.originalFile.name}-${rf.originalFile.lastModified}`} className="bg-gray-700/50 p-3 rounded-lg flex items-center gap-4 animate-fade-in-fast">
                                                    <div className="flex-shrink-0 w-12 h-12 bg-gray-700 rounded-md flex items-center justify-center overflow-hidden">
                                                        {rf.previewUrl ? (
                                                            <img src={rf.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <FileIcon className="w-6 h-6 text-gray-500" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-gray-400 truncate" title={rf.originalFile.name}>{rf.originalFile.name}</p>
                                                        <input
                                                            type="text"
                                                            value={rf.newName}
                                                            onChange={(e) => handleIndividualNameChange(index, e.target.value)}
                                                            className="w-full text-base bg-transparent border-b border-gray-500 focus:border-purple-400 focus:outline-none transition"
                                                        />
                                                    </div>
                                                    {!useSameDateForAll && (
                                                        <input
                                                            type="date"
                                                            value={rf.dateString}
                                                            onChange={(e) => handleIndividualDateChange(index, e.target.value)}
                                                            className="p-1 bg-gray-600 border border-gray-500 rounded-md text-white text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition"
                                                        />
                                                    )}
                                                    <div className="text-sm text-gray-400 whitespace-nowrap">{formatFileSize(rf.originalFile.size)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                       </div>
                    </div>
                </main>
            </div>
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
                @keyframes fade-in-fast {
                    from { opacity: 0; transform: scaleY(0.95); }
                    to { opacity: 1; transform: scaleY(1); }
                }
                .animate-fade-in-fast {
                    animation: fade-in-fast 0.3s ease-out forwards;
                }
                input[type="date"]::-webkit-calendar-picker-indicator {
                    filter: invert(0.8);
                    cursor: pointer;
                }
                 /* Custom scrollbar for file list */
                .overflow-y-auto::-webkit-scrollbar {
                    width: 8px;
                }
                .overflow-y-auto::-webkit-scrollbar-track {
                    background: #2d3748; /* gray-800 */
                    border-radius: 10px;
                }
                .overflow-y-auto::-webkit-scrollbar-thumb {
                    background: #4a5568; /* gray-600 */
                    border-radius: 10px;
                }
                .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                    background: #718096; /* gray-500 */
                }
            `}</style>
        </div>
    );
};

export default App;
